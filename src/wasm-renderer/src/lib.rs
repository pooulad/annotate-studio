use wasm_bindgen::prelude::*;
use web_sys::CanvasRenderingContext2d;
use serde::{Deserialize, Serialize};

#[cfg(feature = "console_error_panic_hook")]
pub use console_error_panic_hook::set_once as set_panic_hook;

#[derive(Clone, Copy, Serialize, Deserialize, Debug)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Stroke {
    pub id: String,
    pub points: Vec<Point>,
    pub color: String,
    pub thickness: f64,
    pub opacity: f64,
    pub tool: String,
    #[serde(default)]
    pub fill_color: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ShapePreview {
    pub shape_type: String,
    pub start: Point,
    pub end: Point,
    pub color: String,
    pub thickness: f64,
    pub opacity: f64,
    pub fill_color: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SymbolPreview {
    pub symbol: String,
    pub start: Point,
    pub end: Point,
    pub color: String,
    pub opacity: f64,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct CurrentStrokeStyle {
    pub color: String,
    pub thickness: f64,
    pub opacity: f64,
}

#[wasm_bindgen]
pub struct RenderEngine {
    width: u32,
    height: u32,
    strokes: Vec<Stroke>,
    current_stroke: Vec<Point>,
    current_style: Option<CurrentStrokeStyle>,
    shape_preview: Option<ShapePreview>,
    symbol_preview: Option<SymbolPreview>,
    selected_id: Option<String>,
    selected_ids: Vec<String>,
    frame_times: Vec<f64>,
    last_frame_time: f64,
}

#[wasm_bindgen]
impl RenderEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> Self {
        #[cfg(feature = "console_error_panic_hook")]
        set_panic_hook();
        
        Self {
            width,
            height,
            strokes: Vec::new(),
            current_stroke: Vec::new(),
            current_style: None,
            shape_preview: None,
            symbol_preview: None,
            selected_id: None,
            selected_ids: Vec::new(),
            frame_times: Vec::with_capacity(60),
            last_frame_time: 0.0,
        }
    }

    #[wasm_bindgen]
    pub fn resize(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
    }

    #[wasm_bindgen]
    pub fn set_strokes(&mut self, strokes_json: &str) {
        if let Ok(strokes) = serde_json::from_str::<Vec<Stroke>>(strokes_json) {
            self.strokes = strokes;
        }
    }

    #[wasm_bindgen]
    pub fn set_current_stroke(&mut self, points_json: &str, style_json: &str) {
        if let Ok(points) = serde_json::from_str::<Vec<Point>>(points_json) {
            self.current_stroke = points;
        }
        if style_json.is_empty() {
            self.current_style = None;
        } else if let Ok(style) = serde_json::from_str::<CurrentStrokeStyle>(style_json) {
            self.current_style = Some(style);
        }
    }

    #[wasm_bindgen]
    pub fn set_shape_preview(&mut self, preview_json: &str) {
        if preview_json.is_empty() {
            self.shape_preview = None;
        } else if let Ok(preview) = serde_json::from_str::<ShapePreview>(preview_json) {
            self.shape_preview = Some(preview);
        }
    }

    #[wasm_bindgen]
    pub fn set_symbol_preview(&mut self, preview_json: &str) {
        if preview_json.is_empty() {
            self.symbol_preview = None;
        } else if let Ok(preview) = serde_json::from_str::<SymbolPreview>(preview_json) {
            self.symbol_preview = Some(preview);
        }
    }

    #[wasm_bindgen]
    pub fn set_selected(&mut self, id: &str) {
        if id.is_empty() {
            self.selected_id = None;
            self.selected_ids.clear();
        } else {
            self.selected_id = Some(id.to_string());
            self.selected_ids = vec![id.to_string()];
        }
    }

    #[wasm_bindgen]
    pub fn set_selected_ids(&mut self, ids_json: &str) {
        if let Ok(ids) = serde_json::from_str::<Vec<String>>(ids_json) {
            self.selected_ids = ids.clone();
            self.selected_id = ids.first().cloned();
        }
    }

    #[wasm_bindgen]
    pub fn record_frame(&mut self, time: f64) {
        if self.last_frame_time > 0.0 {
            let delta = time - self.last_frame_time;
            if delta > 0.0 && delta < 1000.0 {
                if self.frame_times.len() >= 30 {
                    self.frame_times.remove(0);
                }
                self.frame_times.push(delta);
            }
        }
        self.last_frame_time = time;
    }

    #[wasm_bindgen]
    pub fn get_fps(&self) -> f64 {
        if self.frame_times.len() < 5 {
            return 0.0;
        }
        let sum: f64 = self.frame_times.iter().sum();
        let avg = sum / self.frame_times.len() as f64;
        if avg > 0.0 { (1000.0 / avg).min(144.0) } else { 0.0 }
    }

    #[wasm_bindgen]
    pub fn render(&self, ctx: &CanvasRenderingContext2d, has_pdf: bool) {
        if !has_pdf {
            ctx.set_fill_style_str("#ffffff");
            ctx.fill_rect(0.0, 0.0, self.width as f64, self.height as f64);
            self.draw_grid(ctx);
        }
        
        ctx.set_stroke_style_str("#d4d4d8");
        ctx.set_line_width(1.0);
        ctx.stroke_rect(0.0, 0.0, self.width as f64, self.height as f64);
        
        for stroke in &self.strokes {
            let is_selected = self.selected_ids.contains(&stroke.id);
            self.draw_stroke(ctx, stroke, is_selected);
        }
        
        if !self.current_stroke.is_empty() {
            if let Some(ref style) = self.current_style {
                self.draw_pen_stroke(ctx, &self.current_stroke, &style.color, style.thickness, style.opacity);
            }
        }
        
        if let Some(ref preview) = self.shape_preview {
            self.draw_shape_preview(ctx, preview);
        }
        
        if let Some(ref preview) = self.symbol_preview {
            self.draw_symbol_preview(ctx, preview);
        }
    }

    fn draw_grid(&self, ctx: &CanvasRenderingContext2d) {
        ctx.set_stroke_style_str("#e4e4e7");
        ctx.set_line_width(0.5);
        
        ctx.begin_path();
        
        let mut x = 0.0;
        let h = self.height as f64;
        let w = self.width as f64;
        
        while x <= w {
            ctx.move_to(x, 0.0);
            ctx.line_to(x, h);
            x += 20.0;
        }
        
        let mut y = 0.0;
        while y <= h {
            ctx.move_to(0.0, y);
            ctx.line_to(w, y);
            y += 20.0;
        }
        
        ctx.stroke();
    }

    fn draw_stroke(&self, ctx: &CanvasRenderingContext2d, stroke: &Stroke, is_selected: bool) {
        if stroke.tool.starts_with("shape-") {
            self.draw_shape(ctx, stroke, is_selected);
        } else if stroke.tool.starts_with("text:") {
            self.draw_text(ctx, stroke, is_selected);
        } else {
            self.draw_pen_stroke(ctx, &stroke.points, &stroke.color, stroke.thickness, stroke.opacity);
        }
    }

    fn draw_pen_stroke(&self, ctx: &CanvasRenderingContext2d, points: &[Point], color: &str, thickness: f64, opacity: f64) {
        if points.len() < 2 {
            return;
        }
        
        ctx.set_global_alpha(opacity / 100.0);
        ctx.set_stroke_style_str(color);
        ctx.set_line_width(thickness);
        ctx.set_line_cap("round");
        ctx.set_line_join("round");
        
        ctx.begin_path();
        ctx.move_to(points[0].x, points[0].y);
        
        for i in 1..points.len() {
            let mid_x = (points[i - 1].x + points[i].x) / 2.0;
            let mid_y = (points[i - 1].y + points[i].y) / 2.0;
            ctx.quadratic_curve_to(points[i - 1].x, points[i - 1].y, mid_x, mid_y);
        }
        
        let last = &points[points.len() - 1];
        ctx.line_to(last.x, last.y);
        ctx.stroke();
        ctx.set_global_alpha(1.0);
    }

    fn draw_shape(&self, ctx: &CanvasRenderingContext2d, stroke: &Stroke, is_selected: bool) {
        if stroke.points.len() < 2 {
            return;
        }
        
        let shape_type = stroke.tool.replace("shape-", "");
        let start = &stroke.points[0];
        let end = &stroke.points[1];
        
        ctx.set_global_alpha(stroke.opacity / 100.0);
        ctx.set_stroke_style_str(&stroke.color);
        ctx.set_line_width(stroke.thickness);
        ctx.set_line_cap("round");
        ctx.set_line_join("round");
        
        let center_x = (start.x + end.x) / 2.0;
        let center_y = (start.y + end.y) / 2.0;
        let width = (end.x - start.x).abs();
        let height = (end.y - start.y).abs();
        let min_x = start.x.min(end.x);
        let min_y = start.y.min(end.y);
        
        if let Some(ref fill) = stroke.fill_color {
            ctx.set_fill_style_str(fill);
        }
        
        ctx.begin_path();
        
        match shape_type.as_str() {
            "rectangle" => {
                if stroke.fill_color.is_some() {
                    ctx.fill_rect(min_x, min_y, width, height);
                }
                ctx.stroke_rect(min_x, min_y, width, height);
            }
            "circle" => {
                ctx.ellipse(center_x, center_y, width / 2.0, height / 2.0, 0.0, 0.0, std::f64::consts::PI * 2.0).ok();
                if stroke.fill_color.is_some() {
                    ctx.fill();
                }
                ctx.stroke();
            }
            "line" => {
                ctx.move_to(start.x, start.y);
                ctx.line_to(end.x, end.y);
                ctx.stroke();
            }
            "arrow" => {
                ctx.move_to(start.x, start.y);
                ctx.line_to(end.x, end.y);
                ctx.stroke();
                
                let angle = (end.y - start.y).atan2(end.x - start.x);
                let len = 12.0 + stroke.thickness;
                let spread = std::f64::consts::PI / 7.0;
                
                ctx.begin_path();
                ctx.move_to(end.x, end.y);
                ctx.line_to(end.x - len * (angle - spread).cos(), end.y - len * (angle - spread).sin());
                ctx.move_to(end.x, end.y);
                ctx.line_to(end.x - len * (angle + spread).cos(), end.y - len * (angle + spread).sin());
                ctx.stroke();
            }
            "triangle" => {
                ctx.move_to(center_x, min_y);
                ctx.line_to(min_x + width, min_y + height);
                ctx.line_to(min_x, min_y + height);
                ctx.close_path();
                if stroke.fill_color.is_some() {
                    ctx.fill();
                }
                ctx.stroke();
            }
            "diamond" => {
                ctx.move_to(center_x, min_y);
                ctx.line_to(min_x + width, center_y);
                ctx.line_to(center_x, min_y + height);
                ctx.line_to(min_x, center_y);
                ctx.close_path();
                if stroke.fill_color.is_some() {
                    ctx.fill();
                }
                ctx.stroke();
            }
            "star" => {
                let outer_r = width.min(height) / 2.0;
                let inner_r = outer_r * 0.4;
                let spikes = 5;
                let mut rot = -std::f64::consts::PI / 2.0;
                
                ctx.move_to(center_x + outer_r * rot.cos(), center_y + outer_r * rot.sin());
                for _ in 0..spikes {
                    rot += std::f64::consts::PI / spikes as f64;
                    ctx.line_to(center_x + inner_r * rot.cos(), center_y + inner_r * rot.sin());
                    rot += std::f64::consts::PI / spikes as f64;
                    ctx.line_to(center_x + outer_r * rot.cos(), center_y + outer_r * rot.sin());
                }
                ctx.close_path();
                if stroke.fill_color.is_some() {
                    ctx.fill();
                }
                ctx.stroke();
            }
            "heart" => {
                ctx.move_to(center_x, min_y + height * 0.15);
                ctx.bezier_curve_to(center_x, min_y, min_x, min_y, min_x, min_y + height * 0.3);
                ctx.bezier_curve_to(min_x, min_y + height * 0.8, center_x, min_y + height, center_x, min_y + height);
                ctx.bezier_curve_to(center_x, min_y + height, min_x + width, min_y + height * 0.8, min_x + width, min_y + height * 0.3);
                ctx.bezier_curve_to(min_x + width, min_y, center_x, min_y, center_x, min_y + height * 0.15);
                if stroke.fill_color.is_some() {
                    ctx.fill();
                }
                ctx.stroke();
            }
            _ => {}
        }
        
        ctx.set_global_alpha(1.0);
        
        if is_selected {
            self.draw_selection_box(ctx, min_x, min_y, width, height);
        }
    }

    fn draw_text(&self, ctx: &CanvasRenderingContext2d, stroke: &Stroke, is_selected: bool) {
        if stroke.points.is_empty() {
            return;
        }
        
        let text = stroke.tool.replace("text:", "");
        let font_size = (stroke.thickness * 4.0).max(14.0);
        
        ctx.set_global_alpha(stroke.opacity / 100.0);
        ctx.set_fill_style_str(&stroke.color);
        ctx.set_font(&format!("{}px Inter, system-ui, sans-serif", font_size));
        ctx.fill_text(&text, stroke.points[0].x, stroke.points[0].y).ok();
        ctx.set_global_alpha(1.0);
        
        if is_selected {
            let metrics = ctx.measure_text(&text).unwrap_or_else(|_| ctx.measure_text("M").unwrap());
            let text_width = metrics.width();
            self.draw_selection_box(ctx, stroke.points[0].x - 5.0, stroke.points[0].y - font_size, text_width + 10.0, font_size * 1.2);
        }
    }

    fn draw_selection_box(&self, ctx: &CanvasRenderingContext2d, x: f64, y: f64, w: f64, h: f64) {
        let padding = 5.0;
        let box_x = x - padding;
        let box_y = y - padding;
        let box_w = w + padding * 2.0;
        let box_h = h + padding * 2.0;
        
        ctx.set_fill_style_str("rgba(139, 92, 246, 0.08)");
        ctx.fill_rect(box_x, box_y, box_w, box_h);
        ctx.set_stroke_style_str("#8b5cf6");
        ctx.set_line_width(1.5);
        ctx.set_line_dash(&js_sys::Array::new()).ok();
        ctx.stroke_rect(box_x, box_y, box_w, box_h);
        
        let corner_size = 8.0;
        ctx.set_fill_style_str("#ffffff");
        ctx.set_stroke_style_str("#8b5cf6");
        ctx.set_line_width(2.0);
        
        let corners = [
            (box_x - corner_size / 2.0, box_y - corner_size / 2.0),
            (box_x + box_w - corner_size / 2.0, box_y - corner_size / 2.0),
            (box_x - corner_size / 2.0, box_y + box_h - corner_size / 2.0),
            (box_x + box_w - corner_size / 2.0, box_y + box_h - corner_size / 2.0),
        ];
        
        for (cx, cy) in corners {
            ctx.fill_rect(cx, cy, corner_size, corner_size);
            ctx.stroke_rect(cx, cy, corner_size, corner_size);
        }
    }

    fn draw_shape_preview(&self, ctx: &CanvasRenderingContext2d, preview: &ShapePreview) {
        let stroke = Stroke {
            id: String::new(),
            points: vec![preview.start, preview.end],
            color: preview.color.clone(),
            thickness: preview.thickness,
            opacity: preview.opacity,
            tool: format!("shape-{}", preview.shape_type),
            fill_color: preview.fill_color.clone(),
        };
        self.draw_shape(ctx, &stroke, false);
    }

    fn draw_symbol_preview(&self, ctx: &CanvasRenderingContext2d, preview: &SymbolPreview) {
        let size = 20.0_f64.max((preview.end.x - preview.start.x).abs()).max((preview.end.y - preview.start.y).abs());
        let font_size = size.max(14.0);
        
        ctx.set_global_alpha(preview.opacity / 100.0);
        ctx.set_fill_style_str(&preview.color);
        ctx.set_font(&format!("{}px Inter, system-ui, sans-serif", font_size));
        ctx.fill_text(&preview.symbol, preview.start.x, preview.start.y + font_size * 0.8).ok();
        ctx.set_global_alpha(1.0);
        
        ctx.set_stroke_style_str("#8b5cf6");
        ctx.set_line_width(1.0);
        let dash = js_sys::Array::new();
        dash.push(&JsValue::from(4.0));
        dash.push(&JsValue::from(4.0));
        ctx.set_line_dash(&dash).ok();
        ctx.stroke_rect(preview.start.x - 4.0, preview.start.y - 4.0, size + 8.0, size + 8.0);
        ctx.set_line_dash(&js_sys::Array::new()).ok();
    }

    #[wasm_bindgen]
    pub fn hit_test(&self, x: f64, y: f64, radius: f64) -> i32 {
        for (i, stroke) in self.strokes.iter().enumerate().rev() {
            if stroke.tool == "pen" || stroke.tool == "highlighter" {
                for p in &stroke.points {
                    let dist = ((x - p.x).powi(2) + (y - p.y).powi(2)).sqrt();
                    if dist <= radius + stroke.thickness / 2.0 {
                        return i as i32;
                    }
                }
            } else if stroke.tool.starts_with("shape-") && stroke.points.len() >= 2 {
                let min_x = stroke.points[0].x.min(stroke.points[1].x);
                let min_y = stroke.points[0].y.min(stroke.points[1].y);
                let max_x = stroke.points[0].x.max(stroke.points[1].x);
                let max_y = stroke.points[0].y.max(stroke.points[1].y);
                
                if x >= min_x - radius && x <= max_x + radius && y >= min_y - radius && y <= max_y + radius {
                    return i as i32;
                }
            } else if stroke.tool.starts_with("text:") && !stroke.points.is_empty() {
                let font_size = (stroke.thickness * 4.0).max(14.0);
                let text = stroke.tool.replace("text:", "");
                let text_width = text.len() as f64 * font_size * 0.6;
                
                if x >= stroke.points[0].x - radius && x <= stroke.points[0].x + text_width + radius &&
                   y >= stroke.points[0].y - font_size - radius && y <= stroke.points[0].y + radius {
                    return i as i32;
                }
            }
        }
        -1
    }

    #[wasm_bindgen]
    pub fn simplify_points(points_json: &str, tolerance: f64) -> String {
        let points: Vec<Point> = match serde_json::from_str(points_json) {
            Ok(p) => p,
            Err(_) => return "[]".to_string(),
        };

        if points.len() < 3 {
            return serde_json::to_string(&points).unwrap_or_else(|_| "[]".to_string());
        }

        let simplified = douglas_peucker(&points, tolerance);
        serde_json::to_string(&simplified).unwrap_or_else(|_| "[]".to_string())
    }
}

fn douglas_peucker(points: &[Point], tolerance: f64) -> Vec<Point> {
    if points.len() < 3 {
        return points.to_vec();
    }

    let mut max_dist = 0.0;
    let mut max_idx = 0;

    let start = &points[0];
    let end = &points[points.len() - 1];

    for (i, point) in points.iter().enumerate().skip(1).take(points.len() - 2) {
        let dist = perpendicular_distance(point, start, end);
        if dist > max_dist {
            max_dist = dist;
            max_idx = i;
        }
    }

    if max_dist > tolerance {
        let mut left = douglas_peucker(&points[..=max_idx], tolerance);
        let right = douglas_peucker(&points[max_idx..], tolerance);
        left.pop();
        left.extend(right);
        left
    } else {
        vec![points[0], points[points.len() - 1]]
    }
}

fn perpendicular_distance(point: &Point, line_start: &Point, line_end: &Point) -> f64 {
    let dx = line_end.x - line_start.x;
    let dy = line_end.y - line_start.y;
    let line_len_sq = dx * dx + dy * dy;

    if line_len_sq == 0.0 {
        return ((point.x - line_start.x).powi(2) + (point.y - line_start.y).powi(2)).sqrt();
    }

    let t = ((point.x - line_start.x) * dx + (point.y - line_start.y) * dy) / line_len_sq;
    let t = t.clamp(0.0, 1.0);

    let proj_x = line_start.x + t * dx;
    let proj_y = line_start.y + t * dy;

    ((point.x - proj_x).powi(2) + (point.y - proj_y).powi(2)).sqrt()
}
