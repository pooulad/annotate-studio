"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize,
  RotateCcw,
} from "lucide-react"
import type { Tool, ShapeType } from "@/components/Dock"
import { useCanvasStore } from "@/lib/store"

interface Point {
  x: number
  y: number
}

interface ShapeData {
  type: string
  start: Point
  end: Point
}

function drawShape(ctx: CanvasRenderingContext2D, shape: ShapeData, color: string, thickness: number, opacity: number, fillColor?: string) {
  ctx.globalAlpha = opacity / 100
  ctx.strokeStyle = color
  ctx.lineWidth = thickness
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  
  const { start, end, type } = shape
  const centerX = (start.x + end.x) / 2
  const centerY = (start.y + end.y) / 2
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)
  const minX = Math.min(start.x, end.x)
  const minY = Math.min(start.y, end.y)
  
  ctx.beginPath()
  
  switch (type) {
    case "rectangle":
      if (fillColor) {
        ctx.fillStyle = fillColor
        ctx.fillRect(minX, minY, width, height)
      }
      ctx.strokeRect(minX, minY, width, height)
      ctx.globalAlpha = 1
      return
      
    case "circle":
      ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2)
      if (fillColor) {
        ctx.fillStyle = fillColor
        ctx.fill()
      }
      ctx.stroke()
      break
      
    case "line":
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
      break
      
    case "arrow":
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
      
      const arrowAngle = Math.atan2(end.y - start.y, end.x - start.x)
      const arrowLen = 12 + thickness
      const arrowSpread = Math.PI / 7
      
      ctx.beginPath()
      ctx.moveTo(end.x, end.y)
      ctx.lineTo(end.x - arrowLen * Math.cos(arrowAngle - arrowSpread), end.y - arrowLen * Math.sin(arrowAngle - arrowSpread))
      ctx.moveTo(end.x, end.y)
      ctx.lineTo(end.x - arrowLen * Math.cos(arrowAngle + arrowSpread), end.y - arrowLen * Math.sin(arrowAngle + arrowSpread))
      ctx.stroke()
      break
      
    case "triangle":
      ctx.moveTo(centerX, minY)
      ctx.lineTo(minX + width, minY + height)
      ctx.lineTo(minX, minY + height)
      ctx.closePath()
      if (fillColor) {
        ctx.fillStyle = fillColor
        ctx.fill()
      }
      ctx.stroke()
      break
      
    case "star":
      const outerRadius = Math.min(width, height) / 2
      const innerRadius = outerRadius * 0.4
      const spikes = 5
      let rot = -Math.PI / 2
      
      ctx.moveTo(centerX + outerRadius * Math.cos(rot), centerY + outerRadius * Math.sin(rot))
      for (let i = 0; i < spikes; i++) {
        rot += Math.PI / spikes
        ctx.lineTo(centerX + innerRadius * Math.cos(rot), centerY + innerRadius * Math.sin(rot))
        rot += Math.PI / spikes
        ctx.lineTo(centerX + outerRadius * Math.cos(rot), centerY + outerRadius * Math.sin(rot))
      }
      ctx.closePath()
      if (fillColor) {
        ctx.fillStyle = fillColor
        ctx.fill()
      }
      ctx.stroke()
      break
      
    case "diamond":
      ctx.moveTo(centerX, minY)
      ctx.lineTo(minX + width, centerY)
      ctx.lineTo(centerX, minY + height)
      ctx.lineTo(minX, centerY)
      ctx.closePath()
      if (fillColor) {
        ctx.fillStyle = fillColor
        ctx.fill()
      }
      ctx.stroke()
      break
      
    case "heart":
      const heartWidth = width / 2
      const heartHeight = height / 2
      
      ctx.moveTo(centerX, minY + heartHeight * 0.3)
      ctx.bezierCurveTo(
        centerX, minY,
        minX, minY,
        minX, minY + heartHeight * 0.6
      )
      ctx.bezierCurveTo(
        minX, minY + height * 0.8,
        centerX, minY + height,
        centerX, minY + height
      )
      ctx.bezierCurveTo(
        centerX, minY + height,
        minX + width, minY + height * 0.8,
        minX + width, minY + heartHeight * 0.6
      )
      ctx.bezierCurveTo(
        minX + width, minY,
        centerX, minY,
        centerX, minY + heartHeight * 0.3
      )
      if (fillColor) {
        ctx.fillStyle = fillColor
        ctx.fill()
      }
      ctx.stroke()
      break
  }
  
  ctx.globalAlpha = 1
}

interface ViewerProps {
  currentPage: number
  currentPageIndex: number
  totalPages: number
  zoom: number
  onZoomChange: (zoom: number) => void
  onPageChange: (page: number) => void
  onPrevPage: () => void
  onNextPage: () => void
  activeTool: Tool
  activeShape: ShapeType
  strokeColor: string
  strokeThickness: number
  strokeOpacity: number
  pendingSymbol?: string | null
  onSymbolPlaced?: () => void
}

export function Viewer({
  currentPage,
  currentPageIndex,
  totalPages,
  zoom,
  onZoomChange,
  onPrevPage,
  onNextPage,
  activeTool,
  activeShape,
  strokeColor,
  strokeThickness,
  strokeOpacity,
  pendingSymbol,
  onSymbolPlaced,
}: ViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 })
  const [lastPanPoint, setLastPanPoint] = useState<Point>({ x: 0, y: 0 })
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const [shapeStart, setShapeStart] = useState<Point | null>(null)
  const [shapeEnd, setShapeEnd] = useState<Point | null>(null)
  const [symbolStart, setSymbolStart] = useState<Point | null>(null)
  const [symbolEnd, setSymbolEnd] = useState<Point | null>(null)
  const [textInput, setTextInput] = useState<{ position: Point; value: string } | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeCorner, setResizeCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null)

  const { strokes, addStroke, updateStroke, deleteStroke, selectStroke, selectedStrokeId, getStrokeById, undo, redo, canUndo, canRedo, getPageStrokes } = useCanvasStore()

  const handleTextSubmit = useCallback(() => {
    if (textInput && textInput.value.trim()) {
      addStroke({
        points: [textInput.position],
        color: strokeColor,
        thickness: strokeThickness,
        opacity: strokeOpacity,
        tool: `text:${textInput.value}`,
        pageId: currentPage,
      })
    }
    setTextInput(null)
  }, [textInput, strokeColor, strokeThickness, strokeOpacity, currentPage, addStroke])

  const canvasWidth = 595
  const canvasHeight = 842
  const scale = zoom / 100

  const handleZoomIn = useCallback(() => {
    onZoomChange(Math.min(zoom + 25, 400))
  }, [zoom, onZoomChange])

  const handleZoomOut = useCallback(() => {
    onZoomChange(Math.max(zoom - 25, 25))
  }, [zoom, onZoomChange])

  const handleResetZoom = useCallback(() => {
    onZoomChange(100)
    setPanOffset({ x: 0, y: 0 })
  }, [onZoomChange])

  const getCanvasPoint = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    }
  }, [scale])

  const getStrokeBounds = useCallback((stroke: any): { minX: number, minY: number, maxX: number, maxY: number } | null => {
    if (!stroke || stroke.points.length < 1) return null
    
    if (stroke.tool.startsWith("shape-") && stroke.points.length >= 2) {
      return {
        minX: Math.min(stroke.points[0].x, stroke.points[1].x),
        minY: Math.min(stroke.points[0].y, stroke.points[1].y),
        maxX: Math.max(stroke.points[0].x, stroke.points[1].x),
        maxY: Math.max(stroke.points[0].y, stroke.points[1].y),
      }
    } else if (stroke.tool.startsWith("text:")) {
      const text = stroke.tool.replace("text:", "")
      const fontSize = Math.max(14, stroke.thickness * 4)
      const isMathSymbol = text.length === 1 && /[^\x00-\x7F]/.test(text)
      const charWidth = isMathSymbol ? fontSize * 0.7 : fontSize * 0.55
      const textWidth = Math.max(fontSize * 0.6, text.length * charWidth)
      return {
        minX: stroke.points[0].x - 1,
        minY: stroke.points[0].y - fontSize * 0.85,
        maxX: stroke.points[0].x + textWidth - 1,
        maxY: stroke.points[0].y + fontSize * 0.15,
      }
    }
    return null
  }, [])

  const findStrokeAtPoint = useCallback((point: Point): string | null => {
    const pageStrokes = getPageStrokes(currentPage)
    for (let i = pageStrokes.length - 1; i >= 0; i--) {
      const stroke = pageStrokes[i]
      const bounds = getStrokeBounds(stroke)
      
      if (bounds) {
        const padding = 10
        if (
          point.x >= bounds.minX - padding &&
          point.x <= bounds.maxX + padding &&
          point.y >= bounds.minY - padding &&
          point.y <= bounds.maxY + padding
        ) {
          return stroke.id
        }
      }
    }
    return null
  }, [getPageStrokes, currentPage, getStrokeBounds])

  const getResizeCorner = useCallback((point: Point, stroke: any): 'tl' | 'tr' | 'bl' | 'br' | null => {
    const bounds = getStrokeBounds(stroke)
    if (!bounds) return null
    
    const padding = 5
    const cornerSize = 14
    const { minX, minY, maxX, maxY } = bounds
    
    const boxMinX = minX - padding
    const boxMinY = minY - padding
    const boxMaxX = maxX + padding
    const boxMaxY = maxY + padding

    if (point.x >= boxMinX - cornerSize/2 && point.x <= boxMinX + cornerSize/2 &&
        point.y >= boxMinY - cornerSize/2 && point.y <= boxMinY + cornerSize/2) return 'tl'
    if (point.x >= boxMaxX - cornerSize/2 && point.x <= boxMaxX + cornerSize/2 &&
        point.y >= boxMinY - cornerSize/2 && point.y <= boxMinY + cornerSize/2) return 'tr'
    if (point.x >= boxMinX - cornerSize/2 && point.x <= boxMinX + cornerSize/2 &&
        point.y >= boxMaxY - cornerSize/2 && point.y <= boxMaxY + cornerSize/2) return 'bl'
    if (point.x >= boxMaxX - cornerSize/2 && point.x <= boxMaxX + cornerSize/2 &&
        point.y >= boxMaxY - cornerSize/2 && point.y <= boxMaxY + cornerSize/2) return 'br'
    
    return null
  }, [getStrokeBounds])

  const startDrawing = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e)

    if (activeTool === "select") {
      if (selectedStrokeId) {
        const stroke = getStrokeById(selectedStrokeId)
        const corner = getResizeCorner(point, stroke)
        if (corner) {
          setIsResizing(true)
          setResizeCorner(corner)
          return
        }
      }
      
      const strokeId = findStrokeAtPoint(point)
      if (strokeId) {
        selectStroke(strokeId)
        const stroke = getStrokeById(strokeId)
        if (stroke && stroke.points.length > 0) {
          setDragOffset({
            x: point.x - stroke.points[0].x,
            y: point.y - stroke.points[0].y,
          })
          setIsDragging(true)
        }
      } else {
        selectStroke(null)
      }
      return
    }

    if (activeTool === "pan") {
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      return
    }

    if (activeTool === "text") {
      selectStroke(null)
      if (textInput) return
      
      if (pendingSymbol) {
        setIsDrawing(true)
        setSymbolStart(point)
        setSymbolEnd(point)
        return
      }
      
      setTextInput({ position: point, value: "" })
      setTimeout(() => textInputRef.current?.focus(), 10)
      return
    }

    selectStroke(null)

    if (activeTool === "shapes") {
      setIsDrawing(true)
      setShapeStart(point)
      setShapeEnd(point)
      return
    }

    if (activeTool === "fill") {
      const strokeId = findStrokeAtPoint(point)
      if (strokeId) {
        const stroke = getStrokeById(strokeId)
        if (stroke && stroke.tool.startsWith("shape-")) {
          updateStroke(strokeId, { fillColor: strokeColor })
        }
      }
      return
    }

    if (activeTool !== "pen" && activeTool !== "highlighter" && activeTool !== "eraser") return

    setIsDrawing(true)
    setCurrentStroke([point])
  }, [activeTool, getCanvasPoint, findStrokeAtPoint, selectStroke, getStrokeById, getResizeCorner, selectedStrokeId, textInput, pendingSymbol, onSymbolPlaced, addStroke, strokeColor, strokeThickness, strokeOpacity, currentPage])

  const draw = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x
      const dy = e.clientY - lastPanPoint.y
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      return
    }

    if (isResizing && selectedStrokeId && resizeCorner) {
      const point = getCanvasPoint(e)
      const stroke = getStrokeById(selectedStrokeId)
      if (!stroke) return

      if (stroke.tool.startsWith("shape-") && stroke.points.length >= 2) {
        let newPoints = [...stroke.points]
        
        if (resizeCorner === 'tl') {
          newPoints[0] = { x: point.x, y: point.y }
        } else if (resizeCorner === 'tr') {
          newPoints[0] = { x: stroke.points[0].x, y: point.y }
          newPoints[1] = { x: point.x, y: stroke.points[1].y }
        } else if (resizeCorner === 'bl') {
          newPoints[0] = { x: point.x, y: stroke.points[0].y }
          newPoints[1] = { x: stroke.points[1].x, y: point.y }
        } else if (resizeCorner === 'br') {
          newPoints[1] = { x: point.x, y: point.y }
        }
        
        updateStroke(selectedStrokeId, { points: newPoints })
      } else if (stroke.tool.startsWith("text:")) {
        const fontSize = Math.max(14, stroke.thickness * 4)
        const baseY = stroke.points[0].y
        const baseX = stroke.points[0].x
        
        let newFontSize = fontSize
        if (resizeCorner === 'br' || resizeCorner === 'tr') {
          newFontSize = Math.max(14, (point.x - baseX) * 1.5)
        } else if (resizeCorner === 'bl' || resizeCorner === 'tl') {
          newFontSize = Math.max(14, (baseY - point.y + fontSize) * 1.2)
        }
        
        const newThickness = Math.max(1, Math.min(100, Math.round(newFontSize / 4)))
        if (newThickness !== stroke.thickness) {
          updateStroke(selectedStrokeId, { thickness: newThickness })
        }
      }
      return
    }

    if (isDragging && selectedStrokeId) {
      const point = getCanvasPoint(e)
      const stroke = getStrokeById(selectedStrokeId)
      if (!stroke) return
      
      const newX = point.x - dragOffset.x
      const newY = point.y - dragOffset.y
      
      if (stroke.tool.startsWith("shape-") && stroke.points.length >= 2) {
        const dx = newX - stroke.points[0].x
        const dy = newY - stroke.points[0].y
        updateStroke(selectedStrokeId, {
          points: [
            { x: stroke.points[0].x + dx, y: stroke.points[0].y + dy },
            { x: stroke.points[1].x + dx, y: stroke.points[1].y + dy },
          ],
        })
      } else {
        updateStroke(selectedStrokeId, {
          points: [{ x: newX, y: newY }],
        })
      }
      return
    }

    if (!isDrawing) return

    const point = getCanvasPoint(e)

    if (activeTool === "shapes") {
      setShapeEnd(point)
      return
    }

    if (activeTool === "text" && pendingSymbol && symbolStart) {
      setSymbolEnd(point)
      return
    }

    setCurrentStroke(prev => [...prev, point])
  }, [isDrawing, isPanning, isDragging, isResizing, resizeCorner, lastPanPoint, getCanvasPoint, activeTool, pendingSymbol, symbolStart, selectedStrokeId, dragOffset, updateStroke, getStrokeById, getStrokeBounds])

  const stopDrawing = useCallback(() => {
    if (isResizing) {
      setIsResizing(false)
      setResizeCorner(null)
      return
    }

    if (isDragging) {
      setIsDragging(false)
      return
    }

    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (!isDrawing) {
      return
    }

    if (activeTool === "shapes" && shapeStart && shapeEnd) {
      addStroke({
        points: [shapeStart, shapeEnd],
        color: strokeColor,
        thickness: strokeThickness,
        opacity: strokeOpacity,
        tool: `shape-${activeShape}`,
        pageId: currentPage,
      })
      setShapeStart(null)
      setShapeEnd(null)
      setIsDrawing(false)
      return
    }

    if (activeTool === "text" && pendingSymbol && symbolStart && symbolEnd) {
      const size = Math.max(20, Math.abs(symbolEnd.x - symbolStart.x), Math.abs(symbolEnd.y - symbolStart.y))
      const thickness = Math.max(1, Math.min(20, Math.round(size / 4)))
      addStroke({
        points: [symbolStart],
        color: strokeColor,
        thickness: thickness,
        opacity: strokeOpacity,
        tool: `text:${pendingSymbol}`,
        pageId: currentPage,
      })
      setSymbolStart(null)
      setSymbolEnd(null)
      setIsDrawing(false)
      onSymbolPlaced?.()
      return
    }

    if (currentStroke.length === 0) {
      setIsDrawing(false)
      return
    }

    addStroke({
      points: currentStroke,
      color: activeTool === "eraser" ? "#ffffff" : strokeColor,
      thickness: activeTool === "eraser" ? strokeThickness * 3 : strokeThickness,
      opacity: activeTool === "highlighter" ? 40 : strokeOpacity,
      tool: activeTool,
      pageId: currentPage,
    })

    setCurrentStroke([])
    setIsDrawing(false)
  }, [isDrawing, isPanning, isDragging, isResizing, currentStroke, activeTool, strokeColor, strokeThickness, strokeOpacity, currentPage, addStroke, shapeStart, shapeEnd, activeShape, pendingSymbol, symbolStart, symbolEnd, onSymbolPlaced])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo])

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -10 : 10
      onZoomChange(Math.min(Math.max(zoom + delta, 25), 400))
    }
  }, [zoom, onZoomChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.strokeStyle = "#e4e4e7"
    ctx.lineWidth = 0.5
    for (let x = 0; x <= canvasWidth; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
    }
    for (let y = 0; y <= canvasHeight; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }

    ctx.strokeStyle = "#d4d4d8"
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight)

    interface DrawableStroke {
      points: Point[]
      color: string
      thickness: number
      opacity: number
    }

    const drawStroke = (stroke: DrawableStroke) => {
      if (stroke.points.length < 2) return

      ctx.globalAlpha = stroke.opacity / 100
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.thickness
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)

      for (let i = 1; i < stroke.points.length; i++) {
        const midPoint = {
          x: (stroke.points[i - 1].x + stroke.points[i].x) / 2,
          y: (stroke.points[i - 1].y + stroke.points[i].y) / 2,
        }
        ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, midPoint.x, midPoint.y)
      }

      const lastPoint = stroke.points[stroke.points.length - 1]
      ctx.lineTo(lastPoint.x, lastPoint.y)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    getPageStrokes(currentPage).forEach((stroke) => {
      if (stroke.tool.startsWith("shape-")) {
        const shapeType = stroke.tool.replace("shape-", "")
        if (stroke.points.length >= 2) {
          drawShape(ctx, {
            type: shapeType,
            start: stroke.points[0],
            end: stroke.points[1],
          }, stroke.color, stroke.thickness, stroke.opacity, stroke.fillColor)

          if (stroke.id === selectedStrokeId) {
            const bounds = getStrokeBounds(stroke)
            if (bounds) {
              const padding = 5
              const boxX = bounds.minX - padding
              const boxY = bounds.minY - padding
              const boxW = bounds.maxX - bounds.minX + padding * 2
              const boxH = bounds.maxY - bounds.minY + padding * 2

              ctx.fillStyle = "rgba(139, 92, 246, 0.08)"
              ctx.fillRect(boxX, boxY, boxW, boxH)

              ctx.strokeStyle = "#8b5cf6"
              ctx.lineWidth = 1.5
              ctx.setLineDash([])
              ctx.strokeRect(boxX, boxY, boxW, boxH)

              const cornerSize = 8
              ctx.fillStyle = "#ffffff"
              ctx.strokeStyle = "#8b5cf6"
              ctx.lineWidth = 2

              const corners = [
                [boxX - cornerSize/2, boxY - cornerSize/2],
                [boxX + boxW - cornerSize/2, boxY - cornerSize/2],
                [boxX - cornerSize/2, boxY + boxH - cornerSize/2],
                [boxX + boxW - cornerSize/2, boxY + boxH - cornerSize/2],
              ]
              corners.forEach(([cx, cy]) => {
                ctx.fillRect(cx, cy, cornerSize, cornerSize)
                ctx.strokeRect(cx, cy, cornerSize, cornerSize)
              })
            }
          }
        }
      } else if (stroke.tool.startsWith("text:")) {
        const text = stroke.tool.replace("text:", "")
        if (stroke.points.length > 0) {
          const fontSize = Math.max(14, stroke.thickness * 4)
          ctx.globalAlpha = stroke.opacity / 100
          ctx.fillStyle = stroke.color
          ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
          ctx.fillText(text, stroke.points[0].x, stroke.points[0].y)
          ctx.globalAlpha = 1

          if (stroke.id === selectedStrokeId) {
            const bounds = getStrokeBounds(stroke)
            if (bounds) {
              const padding = 5
              const boxX = bounds.minX - padding
              const boxY = bounds.minY - padding
              const boxW = bounds.maxX - bounds.minX + padding * 2
              const boxH = bounds.maxY - bounds.minY + padding * 2

              ctx.fillStyle = "rgba(139, 92, 246, 0.08)"
              ctx.fillRect(boxX, boxY, boxW, boxH)

              ctx.strokeStyle = "#8b5cf6"
              ctx.lineWidth = 1.5
              ctx.setLineDash([])
              ctx.strokeRect(boxX, boxY, boxW, boxH)

              const cornerSize = 8
              ctx.fillStyle = "#ffffff"
              ctx.strokeStyle = "#8b5cf6"
              ctx.lineWidth = 2

              const corners = [
                [boxX - cornerSize/2, boxY - cornerSize/2],
                [boxX + boxW - cornerSize/2, boxY - cornerSize/2],
                [boxX - cornerSize/2, boxY + boxH - cornerSize/2],
                [boxX + boxW - cornerSize/2, boxY + boxH - cornerSize/2],
              ]
              corners.forEach(([cx, cy]) => {
                ctx.fillRect(cx, cy, cornerSize, cornerSize)
                ctx.strokeRect(cx, cy, cornerSize, cornerSize)
              })
            }
          }
        }
      } else {
        drawStroke(stroke)
      }
    })

    if (currentStroke.length > 0) {
      drawStroke({
        points: currentStroke,
        color: activeTool === "eraser" ? "#ffffff" : strokeColor,
        thickness: activeTool === "eraser" ? strokeThickness * 3 : strokeThickness,
        opacity: activeTool === "highlighter" ? 40 : strokeOpacity,
      })
    }

    if (shapeStart && shapeEnd && isDrawing && activeTool === "shapes") {
      drawShape(ctx, {
        type: activeShape,
        start: shapeStart,
        end: shapeEnd,
      }, strokeColor, strokeThickness, strokeOpacity)
    }

    if (symbolStart && symbolEnd && isDrawing && pendingSymbol) {
      const size = Math.max(20, Math.abs(symbolEnd.x - symbolStart.x), Math.abs(symbolEnd.y - symbolStart.y))
      const fontSize = Math.max(14, size)
      ctx.globalAlpha = strokeOpacity / 100
      ctx.fillStyle = strokeColor
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
      ctx.fillText(pendingSymbol, symbolStart.x, symbolStart.y + fontSize * 0.8)
      ctx.globalAlpha = 1

      ctx.strokeStyle = "#8b5cf6"
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(symbolStart.x - 4, symbolStart.y - 4, size + 8, size + 8)
      ctx.setLineDash([])
    }
  }, [strokes, currentStroke, activeTool, strokeColor, strokeThickness, strokeOpacity, currentPage, getPageStrokes, shapeStart, shapeEnd, isDrawing, activeShape, selectedStrokeId, symbolStart, symbolEnd, pendingSymbol, getStrokeBounds])

  const getCursor = useCallback(() => {
    if (isResizing) {
      if (resizeCorner === 'tl' || resizeCorner === 'br') return "nwse-resize"
      if (resizeCorner === 'tr' || resizeCorner === 'bl') return "nesw-resize"
    }
    if (isDragging) return "move"
    switch (activeTool) {
      case "select":
        return selectedStrokeId ? "move" : "default"
      case "pan":
        return isPanning ? "grabbing" : "grab"
      case "pen":
      case "highlighter":
      case "shapes":
        return "crosshair"
      case "eraser":
        return "cell"
      case "text":
        return pendingSymbol ? "crosshair" : "text"
      case "fill":
        return "pointer"
      default:
        return "default"
    }
  }, [activeTool, isPanning, pendingSymbol, isDragging, selectedStrokeId, isResizing, resizeCorner])

  return (
    <TooltipProvider delayDuration={0}>
      <main className="relative flex flex-1 flex-col overflow-hidden bg-zinc-300/70 dark:bg-zinc-900/50">
        <div className="absolute inset-x-0 top-4 z-10 flex justify-center">
          <div className="flex items-center gap-1 rounded-2xl border border-border/50 bg-background/95 px-3 py-2 shadow-xl backdrop-blur-xl dark:bg-zinc-900/95">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg transition-all hover:bg-accent"
                  onClick={handleZoomOut}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <button
              onClick={handleResetZoom}
              className="flex min-w-[56px] items-center justify-center rounded-lg px-2 py-1 text-sm font-medium tabular-nums transition-colors hover:bg-accent"
            >
              {zoom}%
            </button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg transition-all hover:bg-accent"
                  onClick={handleZoomIn}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <div className="mx-2 h-5 w-px bg-border/50" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg transition-all hover:bg-accent disabled:opacity-40"
                  onClick={onPrevPage}
                  disabled={currentPageIndex <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous Page</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-1.5 px-1">
              <span className="text-sm font-semibold tabular-nums">{currentPageIndex}</span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground tabular-nums">{totalPages}</span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg transition-all hover:bg-accent disabled:opacity-40"
                  onClick={onNextPage}
                  disabled={currentPageIndex >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next Page</TooltipContent>
            </Tooltip>

            <div className="mx-2 h-5 w-px bg-border/50" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg transition-all hover:bg-accent"
                  onClick={handleResetZoom}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to Page</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg transition-all hover:bg-accent"
                  onClick={handleResetZoom}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset View</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex flex-1 items-center justify-center overflow-hidden"
          style={{ cursor: getCursor() }}
        >
          <div
            className="relative transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className={cn(
                "shadow-2xl transition-shadow duration-300",
                "dark:shadow-black/50"
              )}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />

            <div className="pointer-events-none absolute -inset-4 rounded-sm border-2 border-dashed border-violet-500/20" />

            <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
              {canvasWidth} × {canvasHeight} px · Page {currentPage}
            </div>

            {textInput && (
              <input
                ref={textInputRef}
                type="text"
                value={textInput.value}
                onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === "Enter") {
                    handleTextSubmit()
                  }
                  if (e.key === "Escape") {
                    setTextInput(null)
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute border-0 bg-transparent outline-none caret-current"
                style={{
                  left: textInput.position.x,
                  top: textInput.position.y - 8,
                  fontSize: Math.max(16, strokeThickness * 5),
                  color: strokeColor,
                  minWidth: 20,
                  width: Math.max(20, textInput.value.length * 12 + 20),
                }}
                autoFocus
              />
            )}
          </div>

        </div>


        {selectedStrokeId && (getStrokeById(selectedStrokeId)?.tool.startsWith("text:") || getStrokeById(selectedStrokeId)?.tool.startsWith("shape-")) && (
          <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-2xl border bg-background/95 p-2 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-full bg-muted p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-full p-0"
                  onClick={() => {
                    const stroke = getStrokeById(selectedStrokeId)
                    if (stroke) {
                      if (stroke.tool.startsWith("shape-") && stroke.points.length >= 2) {
                        updateStroke(selectedStrokeId, { points: [{ x: stroke.points[0].x - 10, y: stroke.points[0].y }, { x: stroke.points[1].x - 10, y: stroke.points[1].y }] })
                      } else {
                        updateStroke(selectedStrokeId, { points: [{ x: stroke.points[0].x - 10, y: stroke.points[0].y }] })
                      }
                    }
                  }}
                >
                  ←
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-full p-0"
                  onClick={() => {
                    const stroke = getStrokeById(selectedStrokeId)
                    if (stroke) {
                      if (stroke.tool.startsWith("shape-") && stroke.points.length >= 2) {
                        updateStroke(selectedStrokeId, { points: [{ x: stroke.points[0].x + 10, y: stroke.points[0].y }, { x: stroke.points[1].x + 10, y: stroke.points[1].y }] })
                      } else {
                        updateStroke(selectedStrokeId, { points: [{ x: stroke.points[0].x + 10, y: stroke.points[0].y }] })
                      }
                    }
                  }}
                >
                  →
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-full p-0"
                  onClick={() => {
                    const stroke = getStrokeById(selectedStrokeId)
                    if (stroke) {
                      if (stroke.tool.startsWith("shape-") && stroke.points.length >= 2) {
                        updateStroke(selectedStrokeId, { points: [{ x: stroke.points[0].x, y: stroke.points[0].y - 10 }, { x: stroke.points[1].x, y: stroke.points[1].y - 10 }] })
                      } else {
                        updateStroke(selectedStrokeId, { points: [{ x: stroke.points[0].x, y: stroke.points[0].y - 10 }] })
                      }
                    }
                  }}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-full p-0"
                  onClick={() => {
                    const stroke = getStrokeById(selectedStrokeId)
                    if (stroke) {
                      if (stroke.tool.startsWith("shape-") && stroke.points.length >= 2) {
                        updateStroke(selectedStrokeId, { points: [{ x: stroke.points[0].x, y: stroke.points[0].y + 10 }, { x: stroke.points[1].x, y: stroke.points[1].y + 10 }] })
                      } else {
                        updateStroke(selectedStrokeId, { points: [{ x: stroke.points[0].x, y: stroke.points[0].y + 10 }] })
                      }
                    }
                  }}
                >
                  ↓
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="flex items-center gap-0.5 rounded-full bg-muted p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-full p-0 text-base font-bold"
                  onClick={() => {
                    const stroke = getStrokeById(selectedStrokeId)
                    if (!stroke) return
                    if (stroke.tool.startsWith("shape-") && stroke.points.length >= 2) {
                      const cx = (stroke.points[0].x + stroke.points[1].x) / 2
                      const cy = (stroke.points[0].y + stroke.points[1].y) / 2
                      const scale = 0.9
                      updateStroke(selectedStrokeId, {
                        points: [
                          { x: cx + (stroke.points[0].x - cx) * scale, y: cy + (stroke.points[0].y - cy) * scale },
                          { x: cx + (stroke.points[1].x - cx) * scale, y: cy + (stroke.points[1].y - cy) * scale },
                        ]
                      })
                    } else if (stroke.thickness > 1) {
                      updateStroke(selectedStrokeId, { thickness: stroke.thickness - 1 })
                    }
                  }}
                >
                  −
                </Button>
                <span className="w-10 text-center text-xs font-medium">
                  {(() => {
                    const stroke = getStrokeById(selectedStrokeId)
                    if (stroke?.tool.startsWith("shape-") && stroke.points.length >= 2) {
                      const w = Math.abs(stroke.points[1].x - stroke.points[0].x)
                      const h = Math.abs(stroke.points[1].y - stroke.points[0].y)
                      return `${Math.round(Math.max(w, h))}px`
                    }
                    return `${Math.max(14, (stroke?.thickness || 3) * 4)}px`
                  })()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-full p-0 text-base font-bold"
                  onClick={() => {
                    const stroke = getStrokeById(selectedStrokeId)
                    if (!stroke) return
                    if (stroke.tool.startsWith("shape-") && stroke.points.length >= 2) {
                      const cx = (stroke.points[0].x + stroke.points[1].x) / 2
                      const cy = (stroke.points[0].y + stroke.points[1].y) / 2
                      const scale = 1.1
                      updateStroke(selectedStrokeId, {
                        points: [
                          { x: cx + (stroke.points[0].x - cx) * scale, y: cy + (stroke.points[0].y - cy) * scale },
                          { x: cx + (stroke.points[1].x - cx) * scale, y: cy + (stroke.points[1].y - cy) * scale },
                        ]
                      })
                    } else if (stroke.thickness < 100) {
                      updateStroke(selectedStrokeId, { thickness: stroke.thickness + 1 })
                    }
                  }}
                >
                  +
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-full p-0 text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900"
                onClick={() => deleteStroke(selectedStrokeId)}
              >
                🗑
              </Button>

              <div className="h-6 w-px bg-border" />

              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => selectStroke(null)}
              >
                ✓
              </Button>
            </div>
          </div>
        )}

      </main>
    </TooltipProvider>
  )
}
