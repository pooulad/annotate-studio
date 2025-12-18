"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as wasmEngine from "./wasm-engine"

interface UseWasmEngineOptions {
  width: number
  height: number
  enabled?: boolean
}

export function useWasmEngine({ width, height, enabled = true }: UseWasmEngineOptions) {
  const [isReady, setIsReady] = useState(false)
  const [fps, setFps] = useState(0)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    let mounted = true

    async function init() {
      const success = await wasmEngine.initWasm()
      if (mounted && success) {
        wasmEngine.createEngine(width, height)
        setIsReady(true)
      }
    }

    init()

    return () => {
      mounted = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [enabled, width, height])

  useEffect(() => {
    const engine = wasmEngine.getEngine()
    if (engine && isReady) {
      engine.resize(width, height)
    }
  }, [width, height, isReady])

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isReady) return

    const now = performance.now()
    wasmEngine.recordFrame(now)
    wasmEngine.render(ctx)

    if (now - lastTimeRef.current > 500) {
      setFps(Math.round(wasmEngine.getFps()))
      lastTimeRef.current = now
    }
  }, [isReady])

  const startRenderLoop = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isReady) return

    function loop() {
      render(ctx)
      animationRef.current = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isReady, render])

  const setTransform = useCallback((scale: number, offsetX: number, offsetY: number) => {
    wasmEngine.setTransform(scale, offsetX, offsetY)
  }, [])

  const pan = useCallback((dx: number, dy: number) => {
    wasmEngine.pan(dx, dy)
  }, [])

  const zoom = useCallback((factor: number, centerX: number, centerY: number) => {
    wasmEngine.zoom(factor, centerX, centerY)
  }, [])

  const addStroke = useCallback((stroke: wasmEngine.Stroke) => {
    wasmEngine.addStroke(stroke)
  }, [])

  const clearStrokes = useCallback(() => {
    wasmEngine.clearStrokes()
  }, [])

  const hitTest = useCallback((x: number, y: number, radius?: number) => {
    return wasmEngine.hitTest(x, y, radius)
  }, [])

  const getTransform = useCallback(() => {
    return wasmEngine.getTransform()
  }, [])

  const simplifyPoints = useCallback((points: wasmEngine.Point[], tolerance?: number) => {
    return wasmEngine.simplifyPoints(points, tolerance)
  }, [])

  return {
    isReady,
    fps,
    render,
    startRenderLoop,
    setTransform,
    pan,
    zoom,
    addStroke,
    clearStrokes,
    hitTest,
    getTransform,
    simplifyPoints,
  }
}
