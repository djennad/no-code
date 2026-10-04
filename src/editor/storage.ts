// Projects are stored in the browser's localStorage.

import { DEFAULT_THEME } from '../runtime/theme'
import type { NodeData, Page, Project } from '../runtime/types'
import { uid } from './id'
import { REGISTRY } from './registry'

const PREFIX = 'nocode.project.'

export interface ProjectSummary {
  id: string
  name: string
  updatedAt: number
  pageCount: number
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function listProjects(): ProjectSummary[] {
  const store = storage()
  if (!store) return []
  const out: ProjectSummary[] = []
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i)
    if (!key?.startsWith(PREFIX)) continue
    try {
      const p = JSON.parse(store.getItem(key) ?? '') as Project
      out.push({ id: p.id, name: p.name, updatedAt: p.updatedAt, pageCount: p.pages.length })
    } catch {
      // Ignore corrupted entries.
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function loadProject(id: string): Project | null {
  const raw = storage()?.getItem(PREFIX + id)
  if (!raw) return null
  try {
    return parseProject(JSON.parse(raw), false)
  } catch {
    return null
  }
}

/** Saves a project. Returns false when the browser refuses (e.g. storage is full). */
export function saveProject(project: Project): boolean {
  try {
    storage()?.setItem(PREFIX + project.id, JSON.stringify(project))
    return true
  } catch {
    return false
  }
}

export function deleteProject(id: string) {
  storage()?.removeItem(PREFIX + id)
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function parseNode(raw: unknown): NodeData {
  if (!isObject(raw) || typeof raw.type !== 'string' || !(raw.type in REGISTRY)) {
    throw new Error('The file contains an unknown component.')
  }
  const node: NodeData = {
    ...(raw as unknown as NodeData),
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    props: isObject(raw.props) ? raw.props : {},
    style: isObject(raw.style) ? (raw.style as NodeData['style']) : {},
  }
  if (REGISTRY[node.type].container) node.children = Array.isArray(raw.children) ? raw.children.map(parseNode) : []
  else delete node.children
  return node
}

/**
 * Validates data loaded from storage or an imported file and fills in defaults.
 * With `freshId`, the project gets a new id so an import never overwrites anything.
 */
export function parseProject(data: unknown, freshId: boolean): Project {
  if (!isObject(data) || !Array.isArray(data.pages) || data.pages.length === 0) {
    throw new Error('This file is not a no-code project.')
  }
  const pages: Page[] = data.pages.map((raw, i) => {
    if (!isObject(raw)) throw new Error('A page in this file is invalid.')
    const root = parseNode(raw.root)
    if (root.type !== 'page') throw new Error('A page in this file is invalid.')
    const name = typeof raw.name === 'string' ? raw.name : `Page ${i + 1}`
    return {
      id: typeof raw.id === 'string' ? raw.id : uid('p'),
      name,
      path: typeof raw.path === 'string' ? raw.path : '',
      title: typeof raw.title === 'string' ? raw.title : name,
      root,
    }
  })
  const now = Date.now()
  const homePageId = typeof data.homePageId === 'string' && pages.some((p) => p.id === data.homePageId) ? data.homePageId : pages[0].id
  return {
    id: freshId || typeof data.id !== 'string' ? uid('prj') : data.id,
    name: typeof data.name === 'string' && data.name.trim() ? data.name : 'Imported project',
    version: 1,
    homePageId,
    pages,
    variables: Array.isArray(data.variables)
      ? data.variables.filter(isObject).map((v) => ({
          id: typeof v.id === 'string' ? v.id : uid('v'),
          name: String(v.name ?? ''),
          type: (['string', 'number', 'boolean', 'json'].includes(v.type as string) ? v.type : 'string') as Project['variables'][number]['type'],
          initial: typeof v.initial === 'string' ? v.initial : JSON.stringify(v.initial ?? ''),
        }))
      : [],
    theme: { ...DEFAULT_THEME, ...(isObject(data.theme) ? data.theme : {}) },
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : now,
    updatedAt: freshId ? now : typeof data.updatedAt === 'number' ? data.updatedAt : now,
  }
}
