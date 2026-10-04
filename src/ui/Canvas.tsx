import { ArrowUp, Copy, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { deleteNode, duplicateNode, setProp } from '../editor/operations'
import { getMeta, nodeLabel } from '../editor/registry'
import { DEVICE_WIDTHS, useCurrentPage, useEditor } from '../editor/store'
import { findNode, findParent } from '../editor/tree'
import { renderDesignPage } from '../runtime/design'
import { canvasDropTarget, currentDrag, endDrag, performDrop, startDrag, type DropTarget, type Rect } from './dnd'

/** Text components that can be edited directly on the canvas. */
const INLINE_EDITABLE = new Set(['heading', 'text', 'link'])

export function focusInspectorField(key: string) {
  window.dispatchEvent(new CustomEvent('nocode:focus-field', { detail: key }))
}

export function Canvas() {
  const project = useEditor((s) => s.project)!
  const page = useCurrentPage()!
  const selectedId = useEditor((s) => s.selectedId)
  const hoveredId = useEditor((s) => s.hoveredId)
  const device = useEditor((s) => s.device)
  const select = useEditor((s) => s.select)
  const hover = useEditor((s) => s.hover)

  const viewportRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const editingRef = useRef<string | null>(null)
  const [renderCount, setRenderCount] = useState(0)
  const [repaint, setRepaint] = useState(0)
  const [drop, setDrop] = useState<DropTarget | null>(null)
  const [badge, setBadge] = useState<(Rect & { label: string; id: string }) | null>(null)

  const elementFor = useCallback((id: string) => mountRef.current?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`) ?? null, [])

  // Render the page into the canvas whenever the project changes.
  useLayoutEffect(() => {
    const mount = mountRef.current
    if (!mount || editingRef.current) return
    mount.replaceChildren(renderDesignPage(document, project, page))
    setRenderCount((n) => n + 1)
  }, [project, page, repaint])

  const updateBadge = useCallback(() => {
    const frame = frameRef.current
    const state = useEditor.getState()
    const id = state.selectedId
    const el = id ? elementFor(id) : null
    const node = id && page ? findNode(page.root, id) : null
    if (!frame || !el || !node) {
      setBadge(null)
      return
    }
    const fr = frame.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    setBadge({ id: node.id, label: nodeLabel(node), left: r.left - fr.left, top: r.top - fr.top, width: r.width, height: r.height })
  }, [elementFor, page])

  // Selection and hover outlines.
  useLayoutEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    mount.querySelectorAll('.nc-selected, .nc-hovered').forEach((el) => el.classList.remove('nc-selected', 'nc-hovered'))
    if (hoveredId && hoveredId !== selectedId) elementFor(hoveredId)?.classList.add('nc-hovered')
    if (selectedId) elementFor(selectedId)?.classList.add('nc-selected')
    updateBadge()
  }, [selectedId, hoveredId, renderCount, elementFor, updateBadge])

  // Keep the badge aligned when the layout changes (images loading, resizing…).
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const observer = new ResizeObserver(() => updateBadge())
    observer.observe(mount)
    window.addEventListener('resize', updateBadge)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateBadge)
    }
  }, [updateBadge])

  // Scroll the selected element into view when it was selected elsewhere (layers panel).
  useEffect(() => {
    if (!selectedId) return
    const el = elementFor(selectedId)
    const viewport = viewportRef.current
    if (!el || !viewport) return
    const r = el.getBoundingClientRect()
    const v = viewport.getBoundingClientRect()
    if (r.bottom < v.top + 20 || r.top > v.bottom - 20) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selectedId, elementFor])

  // Clear drag state when any drag ends, including drags that started in the palette.
  useEffect(() => {
    const clear = () => {
      endDrag()
      setDrop(null)
    }
    document.addEventListener('dragend', clear)
    document.addEventListener('drop', clear)
    return () => {
      document.removeEventListener('dragend', clear)
      document.removeEventListener('drop', clear)
    }
  }, [])

  const nodeElement = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>('[data-node-id]') : null)

  const onClick = (e: React.MouseEvent) => {
    if (editingRef.current) return
    e.preventDefault()
    const el = nodeElement(e.target)
    select(el && mountRef.current?.contains(el) ? el.dataset.nodeId! : null)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const el = nodeElement(e.target)
    if (!el || editingRef.current) return
    const id = el.dataset.nodeId!
    const node = findNode(page.root, id)
    if (!node) return
    const meta = getMeta(node.type)
    if (!meta.textProp) return
    e.preventDefault()
    if (!INLINE_EDITABLE.has(node.type)) {
      focusInspectorField(meta.textProp)
      return
    }
    startInlineEdit(el, id, meta.textProp, String(node.props[meta.textProp] ?? ''), node.type === 'text')
  }

  const startInlineEdit = (el: HTMLElement, id: string, prop: string, raw: string, multiline: boolean) => {
    editingRef.current = id
    el.draggable = false
    el.textContent = raw
    el.contentEditable = 'plaintext-only'
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true'
    el.classList.add('nc-editing')
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    const finish = (commit: boolean) => {
      el.removeEventListener('blur', onBlur)
      el.removeEventListener('keydown', onKey)
      editingRef.current = null
      el.removeAttribute('contenteditable')
      el.classList.remove('nc-editing')
      const value = el.innerText.replace(/\n$/, '')
      if (commit && value !== raw) setProp(id, prop, value)
      else setRepaint((n) => n + 1)
    }
    const onBlur = () => finish(true)
    const onKey = (ev: KeyboardEvent) => {
      ev.stopPropagation()
      if (ev.key === 'Escape') {
        ev.preventDefault()
        finish(false)
      } else if (ev.key === 'Enter' && !ev.shiftKey && !multiline) {
        ev.preventDefault()
        el.blur()
      }
    }
    el.addEventListener('blur', onBlur)
    el.addEventListener('keydown', onKey)
  }

  const onMouseOver = (e: React.MouseEvent) => {
    if (editingRef.current) return
    const el = nodeElement(e.target)
    hover(el ? el.dataset.nodeId! : null)
  }

  const onDragStart = (e: React.DragEvent) => {
    const el = nodeElement(e.target)
    if (!el || el.dataset.nodeId === page.root.id || editingRef.current) {
      e.preventDefault()
      return
    }
    startDrag(e, { kind: 'move', id: el.dataset.nodeId! })
    select(el.dataset.nodeId!)
  }

  const onDragOver = (e: React.DragEvent) => {
    const payload = currentDrag()
    const mount = mountRef.current
    if (!payload || !mount) return
    e.preventDefault()
    e.dataTransfer.dropEffect = payload.kind === 'move' ? 'move' : 'copy'
    setDrop(canvasDropTarget(mount, page.root, e.target, e.clientX, e.clientY, payload))
  }

  const onDrop = (e: React.DragEvent) => {
    const payload = currentDrag()
    const mount = mountRef.current
    e.preventDefault()
    if (!payload || !mount) return
    const target = canvasDropTarget(mount, page.root, e.target, e.clientX, e.clientY, payload)
    endDrag()
    setDrop(null)
    if (target) performDrop(payload, target.parentId, target.index)
  }

  const onDragLeave = (e: React.DragEvent) => {
    if (!viewportRef.current?.contains(e.relatedTarget as Node | null)) setDrop(null)
  }

  const width = DEVICE_WIDTHS[device]
  const parentOfSelected = badge ? findParent(page.root, badge.id) : null

  return (
    <div
      className="ed-viewport"
      ref={viewportRef}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      onScroll={updateBadge}
      onClick={(e) => e.target === e.currentTarget && select(null)}
    >
      <div className={`ed-frame ed-frame--${device}`} ref={frameRef} style={{ width: width ?? undefined }}>
        <div
          className="ed-mount"
          ref={mountRef}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onMouseOver={onMouseOver}
          onMouseLeave={() => hover(null)}
          onDragStart={onDragStart}
        />
        {badge && (
          <div className="ed-badge-wrap" style={{ left: badge.left, top: Math.max(0, badge.top - 26) }}>
            <span className="ed-sel-label">{badge.label}</span>
            {parentOfSelected && (
              <>
                <button type="button" title="Select parent (Esc)" onClick={() => select(parentOfSelected.parent.id)}>
                  <ArrowUp size={13} />
                </button>
                <button type="button" title="Duplicate (Ctrl+D)" onClick={() => duplicateNode(badge.id)}>
                  <Copy size={13} />
                </button>
                <button type="button" title="Delete (Del)" onClick={() => deleteNode(badge.id)}>
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {drop && (
        <>
          <div className="ed-drop-box" style={{ left: drop.box.left, top: drop.box.top, width: drop.box.width, height: drop.box.height }} />
          {drop.line && <div className="ed-drop-line" style={{ left: drop.line.left, top: drop.line.top, width: drop.line.width, height: drop.line.height }} />}
        </>
      )}
    </div>
  )
}
