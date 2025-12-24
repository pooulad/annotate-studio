declare module "wasm-renderer" {
  export default function init(): Promise<void>

  export class RenderEngine {
    constructor(width: number, height: number)
    resize(width: number, height: number): void
    set_strokes(strokes_json: string): void
    set_current_stroke(points_json: string, style_json: string): void
    set_shape_preview(preview_json: string): void
    set_symbol_preview(preview_json: string): void
    set_selected(id: string): void
    set_selected_ids(ids_json: string): void
    record_frame(time: number): void
    get_fps(): number
    render(ctx: CanvasRenderingContext2D, has_pdf: boolean): void
    hit_test(x: number, y: number, radius: number): number
    static simplify_points(points_json: string, tolerance: number): string
  }
}
