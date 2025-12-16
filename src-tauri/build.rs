use std::fs;
use std::path::Path;

fn main() {
    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let target_arch = std::env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();
    let profile = std::env::var("PROFILE").unwrap_or_default();
    
    let (lib_dir, lib_name) = match (target_os.as_str(), target_arch.as_str()) {
        ("windows", "x86_64") => ("libs/pdfium/windows-x64", "pdfium.dll"),
        ("linux", "x86_64") => ("libs/pdfium/linux-x64", "libpdfium.so"),
        ("macos", "x86_64") => ("libs/pdfium/macos-x64", "libpdfium.dylib"),
        ("macos", "aarch64") => ("libs/pdfium/macos-arm64", "libpdfium.dylib"),
        _ => ("libs/pdfium/windows-x64", "pdfium.dll"),
    };
    
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let src_path = Path::new(&manifest_dir).join(lib_dir).join(lib_name);
    
    let target_dir = Path::new(&manifest_dir).join("target").join(&profile);
    let dest_path = target_dir.join(lib_name);
    
    if src_path.exists() && !dest_path.exists() {
        if let Err(e) = fs::create_dir_all(&target_dir) {
            println!("cargo:warning=Failed to create target dir: {}", e);
        }
        if let Err(e) = fs::copy(&src_path, &dest_path) {
            println!("cargo:warning=Failed to copy pdfium library: {}", e);
        } else {
            println!("cargo:warning=Copied {} to {}", src_path.display(), dest_path.display());
        }
    }
    
    tauri_build::build()
}
