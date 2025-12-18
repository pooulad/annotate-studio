declare module "wasm-renderer" {
  export default function init(): Promise<void>

  export class RenderEngine {
    constructor(width: number, height: number)
    resize(width: number, height: number): void
    set_transform(scale: number, offset_x: number, offset_y: number): void
    pan(dx: number, dy: number): void
    zoom(factor: number, center_x: number, center_y: number): void
    add_stroke(stroke_json: string): void
    clear_strokes(): void
    remove_stroke(index: number): void
    is_dirty(): boolean
    get_scale(): number
    get_offset_x(): number
    get_offset_y(): number
    world_to_screen_x(x: number): number
    world_to_screen_y(y: number): number
    render_to_context(ctx: CanvasRenderingContext2D): void
    hit_test(screen_x: number, screen_y: number, radius: number): number
    get_visible_bounds(): Float64Array
  }

  export class PerformanceMonitor {
    constructor()
    frame(current_time: number): void
    get_fps(): number
    get_frame_time(): number
  }

  export function interpolate_points(points_json: string, smoothness: number): string
  export function simplify_points(points_json: string, tolerance: number): string
}
