use base64::{engine::general_purpose::STANDARD, Engine};
use pdfium_render::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

struct AppState {
    current_pdf_path: Mutex<Option<PathBuf>>,
    pdf_page_count: Mutex<usize>,
}

#[derive(Serialize, Deserialize, Clone)]
struct PdfPageInfo {
    page_number: usize,
    width: f32,
    height: f32,
    image_data: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct PdfPageMeta {
    page_number: usize,
    width: f32,
    height: f32,
}

#[derive(Serialize, Deserialize, Clone)]
struct PdfOpenedEvent {
    path: String,
    page_count: usize,
    pages_meta: Vec<PdfPageMeta>,
}

fn get_pdfium() -> Result<Pdfium, String> {
    let exe_path = std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;
    
    let lib_path = Pdfium::pdfium_platform_library_name_at_path(exe_dir);
    
    let bindings = Pdfium::bind_to_library(&lib_path)
        .or_else(|_| Pdfium::bind_to_system_library())
        .map_err(|e| format!("Failed to bind Pdfium: {}", e))?;
    
    Ok(Pdfium::new(bindings))
}

#[tauri::command]
async fn open_pdf(path: String, state: State<'_, AppState>) -> Result<PdfOpenedEvent, String> {
    let pdf_path = PathBuf::from(&path);

    if !pdf_path.exists() {
        return Err("File not found".to_string());
    }

    let pdfium = get_pdfium()?;
    
    let document = pdfium
        .load_pdf_from_file(&pdf_path, None)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;

    let page_count = document.pages().len() as usize;
    
    let mut pages_meta: Vec<PdfPageMeta> = Vec::new();
    
    for index in 0..page_count {
        let page = document.pages().get(index as u16).map_err(|e| format!("Failed to get page {}: {}", index + 1, e))?;
        pages_meta.push(PdfPageMeta {
            page_number: index + 1,
            width: page.width().value,
            height: page.height().value,
        });
    }
    
    *state.current_pdf_path.lock().unwrap() = Some(pdf_path);
    *state.pdf_page_count.lock().unwrap() = page_count;

    Ok(PdfOpenedEvent {
        path,
        page_count,
        pages_meta,
    })
}

#[tauri::command]
async fn render_pdf_page(path: String, page_number: usize, width: Option<i32>) -> Result<PdfPageInfo, String> {
    let pdf_path = PathBuf::from(&path);

    let pdfium = get_pdfium()?;
    
    let document = pdfium
        .load_pdf_from_file(&pdf_path, None)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;

    let page_index: u16 = (page_number - 1).try_into().map_err(|_| "Invalid page number")?;
    
    let page = document
        .pages()
        .get(page_index)
        .map_err(|_| format!("Page {} not found", page_number))?;

    let page_width = page.width().value;
    let page_height = page.height().value;

    let target_width = width.unwrap_or(1600);

    let render_config = PdfRenderConfig::new()
        .set_target_width(target_width)
        .set_maximum_height((target_width as f32 * page_height / page_width) as i32 + 100);

    let image = page
        .render_with_config(&render_config)
        .map_err(|e| format!("Failed to render page: {}", e))?
        .as_image();

    let mut jpeg_data: Vec<u8> = Vec::new();
    image
        .write_to(
            &mut std::io::Cursor::new(&mut jpeg_data),
            image::ImageFormat::Jpeg,
        )
        .map_err(|e| format!("Failed to encode image: {}", e))?;

    let base64_image = STANDARD.encode(&jpeg_data);

    Ok(PdfPageInfo {
        page_number,
        width: page_width,
        height: page_height,
        image_data: format!("data:image/jpeg;base64,{}", base64_image),
    })
}

#[tauri::command]
fn get_pdf_info(state: State<'_, AppState>) -> Result<(Option<String>, usize), String> {
    let path = state.current_pdf_path.lock().unwrap();
    let count = *state.pdf_page_count.lock().unwrap();

    Ok((
        path.as_ref().map(|p| p.to_string_lossy().to_string()),
        count,
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    tauri::Builder::default()
        .manage(AppState {
            current_pdf_path: Mutex::new(None),
            pdf_page_count: Mutex::new(0),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_pdf,
            render_pdf_page,
            get_pdf_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
