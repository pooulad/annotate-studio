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
