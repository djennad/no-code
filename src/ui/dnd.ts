// Drag and drop between the palette, the layers panel and the canvas.

import { BLOCKS } from '../editor/blocks'
import { addBlock, addNode, relocateNode } from '../editor/operations'
import { createNode } from '../editor/registry'
import { contains, findNode } from '../editor/tree'
import type { ComponentType, NodeData } from '../runtime/types'

export type DragPayload = { kind: 'new'; type: ComponentType } | { kind: 'block'; blockId: string } | { kind: 'move'; id: string }

// dataTransfer contents can't be read during dragover, so the payload lives here.
let current: DragPayload | null = null

export function startDrag(e: DragEvent | React.DragEvent, payload: DragPayload) {
  current = payload
  e.dataTransfer!.effectAllowed = payload.kind === 'move' ? 'move' : 'copy'
  // Firefox only starts a drag when some data is set.
  e.dataTransfer!.setData('text/plain', payload.kind === 'move' ? payload.id : payload.kind)
}

export function currentDrag(): DragPayload | null {
  return current
}

export function endDrag() {
  current = null
}

export function performDrop(payload: DragPayload, parentId: string, index: number) {
  if (payload.kind === 'new') addNode(createNode(payload.type), parentId, index)
  else if (payload.kind === 'block') {
    const block = BLOCKS.find((b) => b.id === payload.blockId)
    if (block) addBlock(block, parentId, index)
  } else relocateNode(payload.id, parentId, index)
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface DropTarget {
  parentId: string
  index: number
  /** Insertion line, in viewport coordinates. */
  line: Rect | null
  /** Container that receives the drop, in viewport coordinates. */
  box: Rect
}

function isHorizontal(host: Element): boolean {
  const style = getComputedStyle(host)
  return style.display.includes('flex') && style.flexDirection.startsWith('row')
}

function hostOf(el: HTMLElement): HTMLElement | null {
  const id = el.dataset.nodeId!
  if (el.dataset.childrenHost === id) return el
  return el.querySelector<HTMLElement>(`[data-children-host="${CSS.escape(id)}"]`)
}

function childElements(host: HTMLElement): HTMLElement[] {
  return [...host.children].filter((c): c is HTMLElement => c instanceof HTMLElement && !!c.dataset.nodeId)
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

function targetFor(parent: NodeData, host: HTMLElement, index: number): DropTarget {
  const kids = childElements(host)
  const box = rectOf(host)
  if (kids.length === 0) return { parentId: parent.id, index, line: null, box }
  const horizontal = isHorizontal(host)
  const ref = parent.children?.[index]
  const refEl = ref && kids.find((k) => k.dataset.nodeId === ref.id)
  let line: Rect
  if (refEl) {
    const r = rectOf(refEl)
    line = horizontal ? { left: r.left - 2, top: r.top, width: 4, height: r.height } : { left: r.left, top: r.top - 2, width: r.width, height: 4 }
  } else {
    const r = rectOf(kids[kids.length - 1])
    line = horizontal
      ? { left: r.left + r.width - 2, top: r.top, width: 4, height: r.height }
      : { left: r.left, top: r.top + r.height - 2, width: r.width, height: 4 }
  }
  return { parentId: parent.id, index, line, box }
}

/** Finds where a drop at (x, y) over `target` would land on the canvas. */
export function canvasDropTarget(root: HTMLElement, page: NodeData, target: EventTarget | null, x: number, y: number, payload: DragPayload): DropTarget | null {
  let el = target instanceof Element ? target.closest<HTMLElement>('[data-node-id]') : null
  if (!el || !root.contains(el)) el = root.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(page.id)}"]`)

  // Never drop a node into itself: climb out of the dragged element.
  const moving = payload.kind === 'move' ? findNode(page, payload.id) : null
  while (el && moving && contains(moving, el.dataset.nodeId!)) {
    el = el.parentElement?.closest<HTMLElement>('[data-node-id]') ?? null
  }
  if (!el) return null

  const node = findNode(page, el.dataset.nodeId!)
  if (!node) return null
  const host = node.children ? hostOf(el) : null
  const parentEl = el.parentElement?.closest<HTMLElement>('[data-node-id]') ?? null
  const parent = parentEl ? findNode(page, parentEl.dataset.nodeId!) : null
  const parentHost = parentEl ? hostOf(parentEl) : null

  const beside = (after: boolean): DropTarget | null => {
    if (!parent || !parentHost) return null
    const index = (parent.children ?? []).findIndex((c) => c.id === node.id)
    return targetFor(parent, parentHost, index + (after ? 1 : 0))
  }

  const r = el.getBoundingClientRect()
  const horizontalParent = parentHost ? isHorizontal(parentHost) : false
  const size = horizontalParent ? r.width : r.height
  const pos = horizontalParent ? x - r.left : y - r.top

  if (host) {
    // Near the edge of a container: drop next to it rather than inside.
    if (parent) {
      const edge = Math.min(12, size * 0.2)
      if (pos < edge) return beside(false)
      if (pos > size - edge) return beside(true)
    }
    const horizontal = isHorizontal(host)
    const kids = childElements(host)
    let index = node.children!.length
    for (const kid of kids) {
      const kr = kid.getBoundingClientRect()
      const before = horizontal ? x < kr.left + kr.width / 2 : y < kr.top + kr.height / 2
      if (before) {
        index = node.children!.findIndex((c) => c.id === kid.dataset.nodeId)
        break
      }
    }
    return targetFor(node, host, index)
  }
  return beside(pos > size / 2)
}
