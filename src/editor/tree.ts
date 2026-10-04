// Helpers for working with the node tree. Mutating helpers are meant to be
// used on immer drafts.

import type { Action, NodeData, Page, Project } from '../runtime/types'
import { uid } from './id'

export function walk(node: NodeData, fn: (node: NodeData, parent: NodeData | null) => void, parent: NodeData | null = null) {
  fn(node, parent)
  for (const child of node.children ?? []) walk(child, fn, node)
}

export function findNode(root: NodeData, id: string): NodeData | null {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

export function findParent(root: NodeData, id: string): { parent: NodeData; index: number } | null {
  const children = root.children ?? []
  for (let i = 0; i < children.length; i++) {
    if (children[i].id === id) return { parent: root, index: i }
    const found = findParent(children[i], id)
    if (found) return found
  }
  return null
}

/** Ancestors of `id`, from the root down to (and including) the node itself. */
export function pathTo(root: NodeData, id: string): NodeData[] {
  if (root.id === id) return [root]
  for (const child of root.children ?? []) {
    const path = pathTo(child, id)
    if (path.length) return [root, ...path]
  }
  return []
}

export function findPageOf(project: Project, id: string): Page | null {
  return project.pages.find((p) => findNode(p.root, id)) ?? null
}

/** True when `id` is `node` itself or one of its descendants. */
export function contains(node: NodeData, id: string): boolean {
  return findNode(node, id) !== null
}

function cloneActions(actions: Action[] | undefined): Action[] | undefined {
  return actions?.map((a) => ({ ...a, id: uid('a') }))
}

/** Deep copy of a node with fresh ids. */
export function cloneTree(node: NodeData): NodeData {
  const { children, events, ...rest } = node
  const copy: NodeData = { ...structuredClone(rest), id: uid() }
  if (events) copy.events = Object.fromEntries(Object.entries(events).map(([k, v]) => [k, cloneActions(v)]))
  if (children) copy.children = children.map(cloneTree)
  return copy
}

export function insertNode(root: NodeData, parentId: string, index: number, node: NodeData): boolean {
  const parent = findNode(root, parentId)
  if (!parent) return false
  parent.children ??= []
  const i = Math.max(0, Math.min(index, parent.children.length))
  parent.children.splice(i, 0, node)
  return true
}

export function removeNode(root: NodeData, id: string): NodeData | null {
  const loc = findParent(root, id)
  if (!loc) return null
  const [removed] = loc.parent.children!.splice(loc.index, 1)
  return removed
}

/**
 * Moves a node. `index` is the position in the target parent's children as they
 * are before the move (which is what drop indicators report).
 */
export function moveNode(root: NodeData, id: string, parentId: string, index: number): boolean {
  const node = findNode(root, id)
  const from = findParent(root, id)
  if (!node || !from || contains(node, parentId)) return false
  const target = findNode(root, parentId)
  if (!target) return false
  let i = index
  if (from.parent.id === target.id) {
    if (index === from.index || index === from.index + 1) return false
    if (from.index < index) i--
  }
  from.parent.children!.splice(from.index, 1)
  target.children ??= []
  target.children.splice(Math.max(0, Math.min(i, target.children.length)), 0, node)
  return true
}

export function countNodes(node: NodeData): number {
  let n = 0
  walk(node, () => n++)
  return n
}
