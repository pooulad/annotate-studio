"use client"

export interface PdfPageInfo {
  page_number: number
  width: number
  height: number
  image_data: string
}

export interface PdfPageMeta {
  page_number: number
  width: number
  height: number
}

export interface PdfOpenedEvent {
  path: string
  page_count: number
  pages_meta: PdfPageMeta[]
}

export async function isTauri(): Promise<boolean> {
  if (typeof window === "undefined") return false
  return "__TAURI__" in window
}

export async function openPdfDialog(): Promise<string | null> {
  const tauriAvailable = await isTauri()
  if (!tauriAvailable) {
    console.warn("Tauri not available")
    return null
  }

  const { open } = await import("@tauri-apps/plugin-dialog")
  
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: "PDF Files",
        extensions: ["pdf"],
      },
    ],
  })

  if (selected && typeof selected === "string") {
    return selected
  }
  
  return null
}

export async function openPdf(path: string): Promise<PdfOpenedEvent | null> {
  const tauriAvailable = await isTauri()
  if (!tauriAvailable) {
    console.warn("Tauri not available")
    return null
  }

  const { invoke } = await import("@tauri-apps/api/core")
  
  try {
    const result = await invoke<PdfOpenedEvent>("open_pdf", { path })
    return result
  } catch (error) {
    console.error("Failed to open PDF:", error)
    throw error
  }
}

export async function renderPdfPage(
  path: string,
  pageNumber: number,
  width?: number
): Promise<PdfPageInfo | null> {
  const tauriAvailable = await isTauri()
  if (!tauriAvailable) {
    console.warn("Tauri not available")
    return null
  }

  const { invoke } = await import("@tauri-apps/api/core")
  
  try {
    const result = await invoke<PdfPageInfo>("render_pdf_page", {
      path,
      pageNumber,
      width: width || null,
    })
    return result
  } catch (error) {
    console.error("Failed to render PDF page:", error)
    throw error
  }
}

export interface ProjectData {
  version: string
  pdf_path: string | null
  strokes: string
}

export async function saveProjectDialog(): Promise<string | null> {
  const tauriAvailable = await isTauri()
  if (!tauriAvailable) return null

  const { save } = await import("@tauri-apps/plugin-dialog")
  
  const selected = await save({
    filters: [
      { name: "Annotate Studio Project", extensions: ["asp"] },
      { name: "PDF Document", extensions: ["pdf"] },
    ],
    defaultPath: "project.asp",
  })

  return selected
}

export async function saveProject(path: string, pdfPath: string | null, strokesJson: string): Promise<void> {
  const tauriAvailable = await isTauri()
  if (!tauriAvailable) return

  const { invoke } = await import("@tauri-apps/api/core")
  await invoke("save_project", { path, pdfPath, strokesJson })
}

export async function loadProject(path: string): Promise<ProjectData | null> {
  const tauriAvailable = await isTauri()
  if (!tauriAvailable) return null

  const { invoke } = await import("@tauri-apps/api/core")
  return await invoke<ProjectData>("load_project", { path })
}

export async function exportDialog(defaultName: string = "export.png"): Promise<string | null> {
  const tauriAvailable = await isTauri()
  if (!tauriAvailable) return null

  const { save } = await import("@tauri-apps/plugin-dialog")
  
  const selected = await save({
    filters: [
      { name: "PDF Document", extensions: ["pdf"] },
      { name: "PNG Image", extensions: ["png"] },
      { name: "JPEG Image", extensions: ["jpg", "jpeg"] },
    ],
    defaultPath: defaultName,
  })

  return selected
}

export async function exportCanvas(path: string, imageData: string): Promise<void> {
  const tauriAvailable = await isTauri()
  if (!tauriAvailable) return

  const { invoke } = await import("@tauri-apps/api/core")
  await invoke("export_canvas", { path, imageData })
}

export interface ExportPdfPage {
  image_data: string
  width: number
  height: number
}

export async function exportToPdf(path: string, pages: ExportPdfPage[]): Promise<void> {
  const tauriAvailable = await isTauri()
  if (!tauriAvailable) return

  const { invoke } = await import("@tauri-apps/api/core")
  await invoke("export_to_pdf", { path, pages })
}
