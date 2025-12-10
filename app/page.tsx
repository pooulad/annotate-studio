"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/Header"
import { Viewer } from "@/components/Viewer"
import { Dock, type Tool, type ShapeType } from "@/components/Dock"
import { Sidebar } from "@/components/Sidebar"
import { Inspector } from "@/components/Inspector"
import { ThemeProvider } from "@/components/ThemeProvider"
import { useCanvasStore } from "@/lib/store"

interface Page {
  id: number
  name: string
  hasAnnotations: boolean
}

export default function Home() {
  const [pages, setPages] = useState<Page[]>([
    { id: 1, name: "Page 1", hasAnnotations: false },
  ])
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [activeTool, setActiveTool] = useState<Tool>("select")
  const [activeShape, setActiveShape] = useState<ShapeType>("rectangle")
  const [selectedColor, setSelectedColor] = useState("#18181b")
  const [thickness, setThickness] = useState(3)
  const [opacity, setOpacity] = useState(100)
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null)

  const handleAddPage = useCallback(() => {
    const newId = Math.max(...pages.map(p => p.id)) + 1
    setPages(prev => [...prev, { id: newId, name: `Page ${newId}`, hasAnnotations: false }])
    setCurrentPage(newId)
  }, [pages])

  const handleDeletePage = useCallback((id: number) => {
    if (pages.length <= 1) return
    setPages(prev => prev.filter(p => p.id !== id))
    if (currentPage === id) {
      const remaining = pages.filter(p => p.id !== id)
      setCurrentPage(remaining[0]?.id || 1)
    }
  }, [pages, currentPage])


  const { undo, redo, canUndo, canRedo } = useCanvasStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "=":
          case "+":
            e.preventDefault()
            setZoom((prev) => Math.min(prev + 25, 400))
            break
          case "-":
            e.preventDefault()
            setZoom((prev) => Math.max(prev - 25, 25))
            break
        }
      } else {
        switch (e.key.toLowerCase()) {
          case "v":
            setActiveTool("select")
            break
          case "h":
            setActiveTool("pan")
            break
          case "p":
            setActiveTool("pen")
            break
          case "m":
            setActiveTool("highlighter")
            break
          case "e":
            setActiveTool("eraser")
            break
          case "t":
            setActiveTool("text")
            break
          case "r":
            setActiveShape("rectangle")
            setActiveTool("shapes")
            break
          case "c":
            setActiveShape("circle")
            setActiveTool("shapes")
            break
          case "l":
            setActiveShape("line")
            setActiveTool("shapes")
            break
          case "a":
            setActiveShape("arrow")
            setActiveTool("shapes")
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <ThemeProvider defaultTheme="light" storageKey="luminapdf-theme">
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <Header
          onNewFile={handleAddPage}
          onZoomIn={() => setZoom(prev => Math.min(prev + 25, 400))}
          onZoomOut={() => setZoom(prev => Math.max(prev - 25, 25))}
          onResetZoom={() => setZoom(100)}
        />
        <div className="relative flex flex-1 overflow-hidden">
          <Sidebar
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pages={pages}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
          />
          <Viewer
            currentPage={currentPage}
            currentPageIndex={pages.findIndex(p => p.id === currentPage) + 1}
            totalPages={pages.length}
            zoom={zoom}
            onZoomChange={setZoom}
            onPageChange={setCurrentPage}
            onPrevPage={() => {
              const idx = pages.findIndex(p => p.id === currentPage)
              if (idx > 0) setCurrentPage(pages[idx - 1].id)
            }}
            onNextPage={() => {
              const idx = pages.findIndex(p => p.id === currentPage)
              if (idx < pages.length - 1) setCurrentPage(pages[idx + 1].id)
            }}
            activeTool={activeTool}
            activeShape={activeShape}
            strokeColor={selectedColor}
            strokeThickness={thickness}
            strokeOpacity={opacity}
            pendingSymbol={pendingSymbol}
            onSymbolPlaced={() => {
              setPendingSymbol(null)
              setActiveTool("select")
            }}
          />
          <Inspector
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            thickness={thickness}
            onThicknessChange={setThickness}
            opacity={opacity}
            onOpacityChange={setOpacity}
          />
        </div>
        <Dock
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeShape={activeShape}
          onShapeChange={setActiveShape}
          canUndo={canUndo()}
          canRedo={canRedo()}
          onUndo={undo}
          onRedo={redo}
          onInsertSymbol={(symbol) => {
            setPendingSymbol(symbol)
            setActiveTool("text")
          }}
        />
      </div>
    </ThemeProvider>
  )
}
