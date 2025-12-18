let wasmModule: any = null
let engine: any = null

export interface Point {
  x: number
  y: number
}

export interface Stroke {
  id: string
  points: Point[]
  color: string
  thickness: number
  opacity: number
  tool: string
  fill_color?: string
}

export interface ShapePreview {
  shape_type: string
  start: Point
  end: Point
  color: string
  thickness: number
  opacity: number
  fill_color?: string
}

export interface SymbolPreview {
  symbol: string
  start: Point
  end: Point
  color: string
  opacity: number
}

export interface CurrentStrokeStyle {
  color: string
  thickness: number
  opacity: number
}

export async function initWasm(): Promise<boolean> {
  if (wasmModule) return true

  try {
    wasmModule = await import("wasm-renderer")
    await wasmModule.default()
    return true
  } catch (err) {
    console.warn("WASM not available:", err)
    return false
  }
}

export function createEngine(width: number, height: number): any {
  if (!wasmModule) return null
  engine = new wasmModule.RenderEngine(width, height)
  return engine
}

export function getEngine(): any {
  return engine
}

export function resize(width: number, height: number): void {
  if (engine) engine.resize(width, height)
}

export function setStrokes(strokes: Stroke[]): void {
  if (!engine) return
  engine.set_strokes(JSON.stringify(strokes))
}

export function setCurrentStroke(points: Point[], style: CurrentStrokeStyle | null): void {
  if (!engine) return
  engine.set_current_stroke(
    JSON.stringify(points),
    style ? JSON.stringify(style) : ""
  )
}

export function setShapePreview(preview: ShapePreview | null): void {
  if (!engine) return
  engine.set_shape_preview(preview ? JSON.stringify(preview) : "")
}

export function setSymbolPreview(preview: SymbolPreview | null): void {
  if (!engine) return
  engine.set_symbol_preview(preview ? JSON.stringify(preview) : "")
}

export function setSelected(id: string | null): void {
  if (!engine) return
  engine.set_selected(id || "")
}

export function setSelectedIds(ids: string[]): void {
  if (!engine) return
  engine.set_selected_ids(JSON.stringify(ids))
}

export function recordFrame(time: number): void {
  if (engine) engine.record_frame(time)
}

export function getFps(): number {
  if (!engine) return 0
  return engine.get_fps()
}

export function render(ctx: CanvasRenderingContext2D, hasPdf: boolean): void {
  if (!engine) return
  engine.render(ctx, hasPdf)
}

export function hitTest(x: number, y: number, radius: number = 10): number {
  if (!engine) return -1
  return engine.hit_test(x, y, radius)
}

export function simplifyPoints(points: Point[], tolerance: number = 1.5): Point[] {
  if (!wasmModule || points.length < 3) return points
  try {
    const result = wasmModule.RenderEngine.simplify_points(JSON.stringify(points), tolerance)
    return JSON.parse(result)
  } catch {
    return points
  }
}
