// High-level editing commands used by the UI.

import type { Action, NodeData, Page, Project, StyleProps, Theme, Variable } from '../runtime/types'
import type { Block } from './blocks'
import { slugify, uid } from './id'
import { createNode } from './registry'
import { currentPage, useEditor } from './store'
import { createPage } from './templates'
import { cloneTree, findNode, findParent, insertNode, moveNode, removeNode } from './tree'

const store = () => useEditor.getState()

function onPage(project: Project, pageId: string, fn: (page: Page) => void) {
  const page = project.pages.find((p) => p.id === pageId)
  if (page) fn(page)
}

// ---------------------------------------------------------------------------
// Nodes

export function addNode(node: NodeData, parentId: string, index: number) {
  const { pageId, update, select } = store()
  update((d) => onPage(d, pageId, (page) => insertNode(page.root, parentId, index, node)))
  select(node.id)
}

export function addBlock(block: Block, parentId: string, index: number) {
  const vars = block.variables?.() ?? []
  const node = block.create()
  const { pageId, update, select } = store()
  update((d) => {
    for (const v of vars) if (!d.variables.some((x) => x.name === v.name)) d.variables.push(v)
    onPage(d, pageId, (page) => insertNode(page.root, parentId, index, node))
  })
  select(node.id)
}

/**
 * Where a click-added component goes: inside the selected container, after the
 * selected element, or at the end of the page.
 */
export function insertionPoint(): { parentId: string; index: number } | null {
  const state = store()
  const page = currentPage(state)
  if (!page) return null
  const selected = state.selectedId ? findNode(page.root, state.selectedId) : null
  if (selected?.children) return { parentId: selected.id, index: selected.children.length }
  if (selected) {
    const loc = findParent(page.root, selected.id)
    if (loc) return { parentId: loc.parent.id, index: loc.index + 1 }
  }
  return { parentId: page.root.id, index: page.root.children?.length ?? 0 }
}

export function addComponentAtSelection(type: NodeData['type']) {
  const at = insertionPoint()
  if (at) addNode(createNode(type), at.parentId, at.index)
}

export function addBlockAtSelection(block: Block) {
  const state = store()
  const page = currentPage(state)
  if (!page) return
  // Blocks are full-width sections, so they go on the page itself.
  let index = page.root.children?.length ?? 0
  if (state.selectedId) {
    const top = page.root.children?.findIndex((c) => findNode(c, state.selectedId!)) ?? -1
    if (top >= 0) index = top + 1
  }
  addBlock(block, page.root.id, index)
}

export function relocateNode(id: string, parentId: string, index: number) {
  const { pageId, update } = store()
  update((d) => onPage(d, pageId, (page) => moveNode(page.root, id, parentId, index)))
}

export function deleteNode(id: string) {
  const state = store()
  const page = currentPage(state)
  if (!page || page.root.id === id) return
  const loc = findParent(page.root, id)
  state.update((d) => onPage(d, state.pageId, (p) => removeNode(p.root, id)))
  if (state.selectedId && loc) {
    // Select a neighbour so keyboard users can keep deleting or editing.
    const siblings = loc.parent.children ?? []
    const next = siblings[loc.index + 1] ?? siblings[loc.index - 1]
    state.select(next && next.id !== id ? next.id : loc.parent.id)
  }
}

export function duplicateNode(id: string) {
  const state = store()
  const page = currentPage(state)
  if (!page) return
  const node = findNode(page.root, id)
  const loc = findParent(page.root, id)
  if (!node || !loc) return
  const copy = cloneTree(node)
  state.update((d) => onPage(d, state.pageId, (p) => insertNode(p.root, loc.parent.id, loc.index + 1, copy)))
  state.select(copy.id)
}

export function moveSibling(id: string, delta: -1 | 1) {
  const state = store()
  const page = currentPage(state)
  const loc = page && findParent(page.root, id)
  if (!loc) return
  const target = loc.index + delta
  if (target < 0 || target >= (loc.parent.children?.length ?? 0)) return
  state.update((d) =>
    onPage(d, state.pageId, (p) => {
      const parent = findNode(p.root, loc.parent.id)
      if (!parent?.children) return
      const [node] = parent.children.splice(loc.index, 1)
      parent.children.splice(target, 0, node)
    }),
  )
}

export function copyNode(id: string) {
  const state = store()
  const page = currentPage(state)
  const node = page && findNode(page.root, id)
  if (node && node.type !== 'page') state.setClipboard(node)
}

export function pasteNode() {
  const { clipboard } = store()
  const at = insertionPoint()
  if (clipboard && at) addNode(cloneTree(clipboard), at.parentId, at.index)
}

/** Updates a node on the current page. */
export function updateNode(id: string, fn: (node: NodeData) => void, key?: string) {
  const { pageId, update } = store()
  update(
    (d) =>
      onPage(d, pageId, (page) => {
        const node = findNode(page.root, id)
        if (node) fn(node)
      }),
    key,
  )
}

export function setProp(id: string, key: string, value: unknown) {
  updateNode(id, (n) => {
    n.props[key] = value
  }, `prop:${id}:${key}`)
}

export function setStyle(id: string, key: keyof StyleProps, value: StyleProps[keyof StyleProps] | undefined) {
  updateNode(id, (n) => {
    if (value === undefined || value === '' || value === false) delete n.style[key]
    else (n.style as Record<string, unknown>)[key] = value
  }, `style:${id}:${key}`)
}

export function setEventActions(id: string, event: string, actions: Action[], key?: string) {
  updateNode(id, (n) => {
    n.events ??= {}
    ;(n.events as Record<string, Action[]>)[event] = actions
  }, key)
}

// ---------------------------------------------------------------------------
// Pages

function uniquePath(project: Project, base: string, exceptId?: string): string {
  const root = slugify(base) || 'page'
  let path = root
  let i = 2
  while (project.pages.some((p) => p.path === path && p.id !== exceptId)) path = `${root}-${i++}`
  return path
}

export function addPage(name = 'New page') {
  const state = store()
  if (!state.project) return
  const page = createPage(name, uniquePath(state.project, name))
  state.update((d) => {
    d.pages.push(page)
  })
  state.setPage(page.id)
  return page
}

export function duplicatePage(pageId: string) {
  const state = store()
  const source = state.project?.pages.find((p) => p.id === pageId)
  if (!source || !state.project) return
  const name = `${source.name} copy`
  const page: Page = { ...source, id: uid('p'), name, title: name, path: uniquePath(state.project, name), root: cloneTree(source.root) }
  state.update((d) => {
    d.pages.splice(d.pages.findIndex((p) => p.id === pageId) + 1, 0, page)
  })
  state.setPage(page.id)
}

export function deletePage(pageId: string) {
  const state = store()
  if (!state.project || state.project.pages.length <= 1) return
  state.update((d) => {
    d.pages = d.pages.filter((p) => p.id !== pageId)
    if (d.homePageId === pageId) {
      d.homePageId = d.pages[0].id
      d.pages[0].path = ''
    }
  })
  if (state.pageId === pageId) state.setPage(store().project!.homePageId)
}

export function updatePage(pageId: string, patch: Partial<Pick<Page, 'name' | 'title' | 'path'>>) {
  store().update((d) => {
    const page = d.pages.find((p) => p.id === pageId)
    if (!page) return
    if (patch.name !== undefined) page.name = patch.name
    if (patch.title !== undefined) page.title = patch.title
    if (patch.path !== undefined && page.id !== d.homePageId) {
      // Light cleanup only, so a trailing "-" survives while the user is typing.
      const path = patch.path.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+/, '')
      if (path && !d.pages.some((p) => p.id !== pageId && p.path === path)) page.path = path
      else if (path) page.path = uniquePath(d as Project, path, pageId)
    }
  }, `page:${pageId}:${Object.keys(patch).join()}`)
}

export function setHomePage(pageId: string) {
  store().update((d) => {
    const prev = d.pages.find((p) => p.id === d.homePageId)
    const next = d.pages.find((p) => p.id === pageId)
    if (!next || prev === next) return
    if (prev) prev.path = uniquePath(d as Project, prev.name, prev.id)
    next.path = ''
    d.homePageId = pageId
  })
}

// ---------------------------------------------------------------------------
// Variables, theme and project settings

export function addVariable(): Variable {
  const state = store()
  let n = (state.project?.variables.length ?? 0) + 1
  while (state.project?.variables.some((v) => v.name === `variable${n}`)) n++
  const variable: Variable = { id: uid('v'), name: `variable${n}`, type: 'string', initial: '' }
  state.update((d) => {
    d.variables.push(variable)
  })
  return variable
}

export function updateVariable(id: string, patch: Partial<Omit<Variable, 'id'>>) {
  store().update((d) => {
    const v = d.variables.find((x) => x.id === id)
    if (v) Object.assign(v, patch)
  }, `var:${id}:${Object.keys(patch).join()}`)
}

export function deleteVariable(id: string) {
  store().update((d) => {
    d.variables = d.variables.filter((v) => v.id !== id)
  })
}

export function updateTheme(patch: Partial<Theme>) {
  store().update((d) => {
    Object.assign(d.theme, patch)
  }, `theme:${Object.keys(patch).join()}`)
}

export function renameProject(name: string) {
  store().update((d) => {
    d.name = name
  }, 'project:name')
}
