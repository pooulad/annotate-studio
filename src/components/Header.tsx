"use client"

import { useState } from "react"
import { FileText, Download, Sparkles, Keyboard, Info, FilePlus, FolderOpen, Save, Undo2, Redo2, Scissors, Copy, ClipboardPaste, ZoomIn, ZoomOut, Maximize, Expand, Github, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useCanvasStore, usePdfStore } from "@/lib/store"
import { openPdfDialog, openPdf } from "@/lib/tauri"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

const shortcuts = [
  { category: "Tools", items: [
    { key: "V", action: "Select Tool" },
    { key: "H", action: "Pan / Hand Tool" },
    { key: "P", action: "Pen Tool" },
    { key: "M", action: "Highlighter" },
    { key: "E", action: "Eraser" },
    { key: "T", action: "Text Tool" },
  ]},
  { category: "Shapes", items: [
    { key: "R", action: "Rectangle" },
    { key: "C", action: "Circle / Ellipse" },
    { key: "L", action: "Line" },
    { key: "A", action: "Arrow" },
  ]},
  { category: "Selection", items: [
    { key: "Click + Drag", action: "Move Selected" },
    { key: "Corner Drag", action: "Resize Selected" },
    { key: "Delete", action: "Delete Selected" },
  ]},
  { category: "General", items: [
    { key: "Ctrl+Z", action: "Undo" },
    { key: "Ctrl+Y", action: "Redo" },
    { key: "Ctrl+Shift+Z", action: "Redo" },
    { key: "Ctrl+Scroll", action: "Zoom In/Out" },
  ]},
]

interface HeaderProps {
  onNewFile?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetZoom?: () => void
  onFullScreen?: () => void
  onPdfLoaded?: () => void
}

export function Header({ onNewFile, onZoomIn, onZoomOut, onResetZoom, onFullScreen, onPdfLoaded }: HeaderProps) {
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const { undo, redo, canUndo, canRedo } = useCanvasStore()
  const { setPdfPath, setPagesMeta, setLoading, setError, isLoading, clearPdf } = usePdfStore()

  const handleOpenPdf = async () => {
    try {
      setLoading(true)
      setError(null)
      clearPdf()
      
      const filePath = await openPdfDialog()
      if (!filePath) {
        setLoading(false)
        return
      }

      const pdfInfo = await openPdf(filePath)
      
      if (pdfInfo) {
        setPdfPath(pdfInfo.path)
        setPagesMeta(
          pdfInfo.pages_meta.map((p) => ({
            pageNumber: p.page_number,
            width: p.width,
            height: p.height,
          }))
        )
        onPdfLoaded?.()
      }
    } catch (err) {
      console.error("[Frontend] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to open PDF")
    } finally {
      setLoading(false)
    }
  }

  const handleFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  return (
    <>
    <header className="flex h-12 items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Annotate Studio</span>
        </div>

        <Menubar className="border-none bg-transparent shadow-none">
          <MenubarMenu>
            <MenubarTrigger className="h-8 px-3 py-1.5 text-sm font-normal transition-colors hover:bg-accent data-[state=open]:bg-accent">
              File
            </MenubarTrigger>
            <MenubarContent className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
              <MenubarItem className="gap-2 transition-colors" onClick={onNewFile}>
                <FilePlus className="h-4 w-4" />
                New <MenubarShortcut>Ctrl+N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="gap-2 transition-colors" onClick={handleOpenPdf} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
                Open PDF <MenubarShortcut>Ctrl+O</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="gap-2 transition-colors">
                <Save className="h-4 w-4" />
                Save <MenubarShortcut>Ctrl+S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="transition-colors">
                Save As <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="gap-2 transition-colors">
                <Download className="h-4 w-4" />
                Export
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-8 px-3 py-1.5 text-sm font-normal transition-colors hover:bg-accent data-[state=open]:bg-accent">
              Edit
            </MenubarTrigger>
            <MenubarContent className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
              <MenubarItem className="gap-2 transition-colors" onClick={() => undo()} disabled={!canUndo()}>
                <Undo2 className="h-4 w-4" />
                Undo <MenubarShortcut>Ctrl+Z</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="gap-2 transition-colors" onClick={() => redo()} disabled={!canRedo()}>
                <Redo2 className="h-4 w-4" />
                Redo <MenubarShortcut>Ctrl+Y</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="gap-2 transition-colors">
                <Scissors className="h-4 w-4" />
                Cut <MenubarShortcut>Ctrl+X</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="gap-2 transition-colors">
                <Copy className="h-4 w-4" />
                Copy <MenubarShortcut>Ctrl+C</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="gap-2 transition-colors">
                <ClipboardPaste className="h-4 w-4" />
                Paste <MenubarShortcut>Ctrl+V</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-8 px-3 py-1.5 text-sm font-normal transition-colors hover:bg-accent data-[state=open]:bg-accent">
              View
            </MenubarTrigger>
            <MenubarContent className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
              <MenubarItem className="gap-2 transition-colors" onClick={onZoomIn}>
                <ZoomIn className="h-4 w-4" />
                Zoom In <MenubarShortcut>Ctrl++</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="gap-2 transition-colors" onClick={onZoomOut}>
                <ZoomOut className="h-4 w-4" />
                Zoom Out <MenubarShortcut>Ctrl+-</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="gap-2 transition-colors" onClick={onResetZoom}>
                <Maximize className="h-4 w-4" />
                Reset Zoom
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="gap-2 transition-colors" onClick={handleFullScreen}>
                <Expand className="h-4 w-4" />
                Full Screen <MenubarShortcut>F11</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="h-8 px-3 py-1.5 text-sm font-normal transition-colors hover:bg-accent data-[state=open]:bg-accent">
              Help
            </MenubarTrigger>
            <MenubarContent className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
              <MenubarItem className="transition-colors">
                Documentation
              </MenubarItem>
              <MenubarItem className="gap-2 transition-colors" onClick={() => setShowShortcuts(true)}>
                <Keyboard className="h-4 w-4" />
                Keyboard Shortcuts
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="gap-2 transition-colors" onClick={() => setShowAbout(true)}>
                <Info className="h-4 w-4" />
                About Annotate Studio
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
    </header>

    <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-violet-500" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {shortcuts.map((group) => (
              <div key={group.category}>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{group.category}</h4>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-sm">{item.action}</span>
                      <kbd className="rounded-md bg-background px-2 py-1 text-xs font-mono shadow-sm border">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <Dialog open={showAbout} onOpenChange={setShowAbout}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Annotate Studio</h2>
            <p className="text-sm text-muted-foreground">Version 1.0.0</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A powerful and modern annotation tool for documents and images. 
            Draw shapes, add text, highlight content, and export your work with ease.
          </p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Developed by <span className="font-medium text-foreground">CluvexStudio</span> & <span className="font-medium text-foreground">ParsaDostifam</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Built with Next.js, React, and Tauri
            </p>
          </div>
          <a 
            href="https://github.com/annotate-studio/annotate-studio" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 dark:hover:bg-zinc-700 hover:scale-105"
          >
            <Github className="h-4 w-4" />
            View on GitHub
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
