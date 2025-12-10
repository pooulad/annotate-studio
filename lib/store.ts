"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ColorStore {
  customColors: string[]
  addCustomColor: (color: string) => void
  removeCustomColor: (color: string) => void
  recentColors: string[]
  addRecentColor: (color: string) => void
}

export const useColorStore = create<ColorStore>()(
  persist(
    (set, get) => ({
      customColors: [],
      addCustomColor: (color: string) => {
        const colors = get().customColors
        if (!colors.includes(color) && colors.length < 16) {
          set({ customColors: [...colors, color] })
        }
      },
      removeCustomColor: (color: string) => {
        set({ customColors: get().customColors.filter((c) => c !== color) })
      },
      recentColors: [],
      addRecentColor: (color: string) => {
        const recent = get().recentColors.filter((c) => c !== color)
        set({ recentColors: [color, ...recent].slice(0, 8) })
      },
    }),
    {
      name: "annotate-studio-colors",
    }
  )
)

interface SettingsStore {
  sidebarCollapsed: boolean
  inspectorCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  setInspectorCollapsed: (collapsed: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      inspectorCollapsed: false,
      setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
      setInspectorCollapsed: (collapsed: boolean) => set({ inspectorCollapsed: collapsed }),
    }),
    {
      name: "annotate-studio-settings",
    }
  )
)

interface Point {
  x: number
  y: number
}

interface Stroke {
  id: string
  points: Point[]
  color: string
  thickness: number
  opacity: number
  tool: string
  pageId: number
  timestamp: number
  fillColor?: string
}

interface CanvasStore {
  strokes: Stroke[]
  undoStack: Stroke[][]
  redoStack: Stroke[][]
  currentPageId: number
  selectedStrokeId: string | null
  
  addStroke: (stroke: Omit<Stroke, "id" | "timestamp">) => void
  updateStroke: (id: string, updates: Partial<Pick<Stroke, "points" | "thickness" | "color" | "fillColor">>) => void
  deleteStroke: (id: string) => void
  selectStroke: (id: string | null) => void
  getStrokeById: (id: string) => Stroke | undefined
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
  getPageStrokes: (pageId: number) => Stroke[]
  clearPage: (pageId: number) => void
  setCurrentPage: (pageId: number) => void
}

export const useCanvasStore = create<CanvasStore>()((set, get) => ({
  strokes: [],
  undoStack: [],
  redoStack: [],
  currentPageId: 1,
  selectedStrokeId: null,

  addStroke: (strokeData) => {
    const newStroke: Stroke = {
      ...strokeData,
      id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }
    
    set((state) => ({
      strokes: [...state.strokes, newStroke],
      undoStack: [...state.undoStack, state.strokes],
      redoStack: [],
    }))
  },

  updateStroke: (id, updates) => {
    set((state) => ({
      strokes: state.strokes.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      undoStack: [...state.undoStack, state.strokes],
      redoStack: [],
    }))
  },

  deleteStroke: (id) => {
    set((state) => ({
      strokes: state.strokes.filter((s) => s.id !== id),
      undoStack: [...state.undoStack, state.strokes],
      redoStack: [],
      selectedStrokeId: state.selectedStrokeId === id ? null : state.selectedStrokeId,
    }))
  },

  selectStroke: (id) => set({ selectedStrokeId: id }),

  getStrokeById: (id) => get().strokes.find((s) => s.id === id),

  undo: () => {
    const { undoStack, strokes } = get()
    if (undoStack.length === 0) return false

    const previousState = undoStack[undoStack.length - 1]
    set({
      strokes: previousState,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, strokes],
    })
    return true
  },

  redo: () => {
    const { redoStack, strokes } = get()
    if (redoStack.length === 0) return false

    const nextState = redoStack[redoStack.length - 1]
    set({
      strokes: nextState,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, strokes],
    })
    return true
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  getPageStrokes: (pageId) => get().strokes.filter((s) => s.pageId === pageId),

  clearPage: (pageId) => {
    set((state) => ({
      strokes: state.strokes.filter((s) => s.pageId !== pageId),
      undoStack: [...state.undoStack, state.strokes],
      redoStack: [],
    }))
  },

  setCurrentPage: (pageId) => set({ currentPageId: pageId }),
}))
