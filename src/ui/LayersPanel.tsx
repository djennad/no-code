import { ChevronRight, EyeOff, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMeta, nodeLabel } from '../editor/registry'
import { useCurrentPage, useEditor } from '../editor/store'
import { contains, findNode, findParent, pathTo } from '../editor/tree'
import type { NodeData } from '../runtime/types'
import { currentDrag, endDrag, performDrop, startDrag } from './dnd'

type DropSpot = { id: string; where: 'before' | 'after' | 'inside' }

export function LayersPanel() {
  const page = useCurrentPage()!
  const selectedId = useEditor((s) => s.selectedId)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [spot, setSpot] = useState<DropSpot | null>(null)

  // When the selection changes, reveal it by expanding its ancestors.
  const root = page.root
  useEffect(() => {
    if (!selectedId) return
    const ancestors = pathTo(root, selectedId).slice(0, -1)
    setCollapsed((prev) => {
      if (!ancestors.some((a) => prev.has(a.id))) return prev
      const next = new Set(prev)
      for (const a of ancestors) next.delete(a.id)
      return next
    })
    requestAnimationFrame(() => document.querySelector(`.ed-layer[data-layer="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: 'nearest' }))
    // Only selection changes should reveal; edits to the tree should not undo a manual collapse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const drop = () => {
    const payload = currentDrag()
    endDrag()
    const target = spot
    setSpot(null)
    if (!payload || !target) return
    const node = findNode(page.root, target.id)
    if (!node) return
    if (target.where === 'inside') {
      performDrop(payload, node.id, node.children?.length ?? 0)
      return
    }
    const loc = findParent(page.root, node.id)
    if (loc) performDrop(payload, loc.parent.id, loc.index + (target.where === 'after' ? 1 : 0))
  }

  return (
    <div className="ed-panel-scroll ed-layers" onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setSpot(null)}>
      <p className="ed-muted ed-hint">Drag layers to reorder or nest them.</p>
      <ul role="tree" aria-label="Page layers">
        <Layer node={page.root} depth={0} collapsed={collapsed} toggle={toggle} spot={spot} setSpot={setSpot} onDrop={drop} root={page.root} />
      </ul>
    </div>
  )
}

interface LayerProps {
  node: NodeData
  root: NodeData
  depth: number
  collapsed: Set<string>
  toggle: (id: string) => void
  spot: DropSpot | null
  setSpot: (spot: DropSpot | null) => void
  onDrop: () => void
}

function Layer({ node, root, depth, collapsed, toggle, spot, setSpot, onDrop }: LayerProps) {
  const selected = useEditor((s) => s.selectedId === node.id)
  const hovered = useEditor((s) => s.hoveredId === node.id)
  const select = useEditor((s) => s.select)
  const hover = useEditor((s) => s.hover)
  const meta = getMeta(node.type)
  const Icon = meta.icon
  const isOpen = !collapsed.has(node.id)
  const hasChildren = !!node.children?.length
  const isRoot = node.id === root.id
  const actions = Object.values(node.events ?? {}).some((list) => list?.length)
  const conditional = !!node.visibleIf?.trim() || (node.hideOn && node.hideOn !== 'none')

  const onDragOver = (e: React.DragEvent) => {
    const payload = currentDrag()
    if (!payload) return
    if (payload.kind === 'move') {
      const moving = findNode(root, payload.id)
      if (moving && contains(moving, node.id)) return
    }
    e.preventDefault()
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const y = (e.clientY - r.top) / r.height
    let where: DropSpot['where']
    if (isRoot) where = 'inside'
    else if (node.children) where = y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'inside'
    else where = y < 0.5 ? 'before' : 'after'
    if (spot?.id !== node.id || spot.where !== where) setSpot({ id: node.id, where })
  }

  const dropClass = spot?.id === node.id ? ` drop-${spot.where}` : ''

  return (
    <li role="treeitem" aria-selected={selected} aria-expanded={hasChildren ? isOpen : undefined}>
      <div
        className={`ed-layer${selected ? ' is-selected' : ''}${hovered ? ' is-hovered' : ''}${dropClass}`}
        data-layer={node.id}
        style={{ paddingLeft: 6 + depth * 14 }}
        draggable={!isRoot}
        onDragStart={(e) => {
          e.stopPropagation()
          startDrag(e, { kind: 'move', id: node.id })
        }}
        onDragEnd={() => {
          endDrag()
          setSpot(null)
        }}
        onDragOver={onDragOver}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDrop()
        }}
        onClick={() => select(node.id)}
        onMouseEnter={() => hover(node.id)}
        onMouseLeave={() => hover(null)}
      >
        <button
          type="button"
          className={`ed-layer-toggle${hasChildren ? '' : ' is-hidden'}`}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          onClick={(e) => {
            e.stopPropagation()
            toggle(node.id)
          }}
        >
          <ChevronRight size={12} className={isOpen ? 'is-open' : ''} />
        </button>
        <Icon size={14} className="ed-layer-icon" />
        <span className="ed-layer-name">{isRoot ? 'Page' : nodeLabel(node)}</span>
        {actions && <Zap size={12} className="ed-layer-flag" aria-label="Has actions" />}
        {conditional && <EyeOff size={12} className="ed-layer-flag" aria-label="Conditionally visible" />}
      </div>
      {hasChildren && isOpen && (
        <ul role="group">
          {node.children!.map((child) => (
            <Layer key={child.id} node={child} root={root} depth={depth + 1} collapsed={collapsed} toggle={toggle} spot={spot} setSpot={setSpot} onDrop={onDrop} />
          ))}
        </ul>
      )}
    </li>
  )
}
