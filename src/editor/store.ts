import { produce, type Draft } from 'immer'
import { create } from 'zustand'
import type { NodeData, Page, Project } from '../runtime/types'
import { findNode } from './tree'

export type Device = 'desktop' | 'tablet' | 'mobile'
export type LeftTab = 'add' | 'layers' | 'pages' | 'data' | 'theme'

export const DEVICE_WIDTHS: Record<Device, number | null> = { desktop: null, tablet: 768, mobile: 390 }

const HISTORY_LIMIT = 100
const COALESCE_MS = 1200

interface EditorState {
  project: Project | null
  past: Project[]
  future: Project[]
  lastKey: string | null
  lastTime: number
  pageId: string
  selectedId: string | null
  hoveredId: string | null
  device: Device
  leftTab: LeftTab
  previewing: boolean
  clipboard: NodeData | null

  open(project: Project): void
  close(): void
  /**
   * Applies a change to the project and records it for undo. Consecutive changes
   * with the same `key` (e.g. typing in one field) are merged into one undo step.
   */
  update(recipe: (draft: Draft<Project>) => void, key?: string): void
  undo(): void
  redo(): void
  select(id: string | null): void
  hover(id: string | null): void
  setPage(id: string): void
  setDevice(device: Device): void
  setLeftTab(tab: LeftTab): void
  setPreviewing(on: boolean): void
  setClipboard(node: NodeData | null): void
}

export const useEditor = create<EditorState>()((set, get) => ({
  project: null,
  past: [],
  future: [],
  lastKey: null,
  lastTime: 0,
  pageId: '',
  selectedId: null,
  hoveredId: null,
  device: 'desktop',
  leftTab: 'add',
  previewing: false,
  clipboard: null,

  open: (project) =>
    set({
      project,
      past: [],
      future: [],
      lastKey: null,
      pageId: project.homePageId,
      selectedId: null,
      hoveredId: null,
      previewing: false,
    }),

  close: () => set({ project: null, past: [], future: [], selectedId: null, hoveredId: null, previewing: false }),

  update: (recipe, key) => {
    const { project, past, lastKey, lastTime } = get()
    if (!project) return
    const changed = produce(project, recipe)
    if (changed === project) return
    const now = Date.now()
    const next = produce(changed, (d) => {
      d.updatedAt = now
    })
    const merge = !!key && key === lastKey && now - lastTime < COALESCE_MS
    set({
      project: next,
      past: merge ? past : [...past.slice(-(HISTORY_LIMIT - 1)), project],
      future: [],
      lastKey: key ?? null,
      lastTime: now,
    })
  },

  undo: () => {
    const { project, past, future } = get()
    if (!project || past.length === 0) return
    const prev = past[past.length - 1]
    set({ project: prev, past: past.slice(0, -1), future: [project, ...future], lastKey: null, ...repair(get(), prev) })
  },

  redo: () => {
    const { project, past, future } = get()
    if (!project || future.length === 0) return
    const next = future[0]
    set({ project: next, past: [...past, project], future: future.slice(1), lastKey: null, ...repair(get(), next) })
  },

  select: (id) => set({ selectedId: id }),
  hover: (id) => set((s) => (s.hoveredId === id ? s : { hoveredId: id })),
  setPage: (id) => set({ pageId: id, selectedId: null, hoveredId: null }),
  setDevice: (device) => set({ device }),
  setLeftTab: (leftTab) => set({ leftTab }),
  setPreviewing: (previewing) => set({ previewing, hoveredId: null }),
  setClipboard: (clipboard) => set({ clipboard }),
}))

/** Keeps the current page and selection valid after undo/redo. */
function repair(state: EditorState, project: Project): Partial<EditorState> {
  const page = project.pages.find((p) => p.id === state.pageId) ?? project.pages.find((p) => p.id === project.homePageId) ?? project.pages[0]
  const selectedId = state.selectedId && findNode(page.root, state.selectedId) ? state.selectedId : null
  return { pageId: page.id, selectedId }
}

export function currentPage(state: Pick<EditorState, 'project' | 'pageId'>): Page | null {
  const { project, pageId } = state
  if (!project) return null
  return project.pages.find((p) => p.id === pageId) ?? project.pages.find((p) => p.id === project.homePageId) ?? project.pages[0]
}

export function useCurrentPage(): Page | null {
  return useEditor((s) => currentPage(s))
}

export function useSelectedNode(): NodeData | null {
  return useEditor((s) => {
    const page = currentPage(s)
    return page && s.selectedId ? findNode(page.root, s.selectedId) : null
  })
}
