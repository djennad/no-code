import { LayoutTemplate, Search } from 'lucide-react'
import { useState } from 'react'
import { BLOCKS } from '../editor/blocks'
import { addBlockAtSelection, addComponentAtSelection } from '../editor/operations'
import { PALETTE, REGISTRY } from '../editor/registry'
import { endDrag, startDrag } from './dnd'

export function AddPanel() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = (text: string) => !q || text.toLowerCase().includes(q)

  const groups = PALETTE.map((g) => ({
    ...g,
    types: g.types.filter((t) => matches(`${REGISTRY[t].label} ${REGISTRY[t].description} ${g.category}`)),
  })).filter((g) => g.types.length)
  const blocks = BLOCKS.filter((b) => matches(`${b.label} ${b.description} block section`))

  return (
    <div className="ed-panel-scroll">
      <div className="ed-search">
        <Search size={14} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search components" aria-label="Search components" />
      </div>
      <p className="ed-muted ed-hint">Drag onto the page, or click to add after the selected element.</p>
      {groups.map((g) => (
        <section key={g.category} className="ed-palette-group">
          <h3 className="ed-panel-heading">{g.category}</h3>
          <div className="ed-palette">
            {g.types.map((type) => {
              const meta = REGISTRY[type]
              const Icon = meta.icon
              return (
                <button
                  key={type}
                  type="button"
                  className="ed-tile"
                  draggable
                  title={meta.description}
                  onDragStart={(e) => startDrag(e, { kind: 'new', type })}
                  onDragEnd={endDrag}
                  onClick={() => addComponentAtSelection(type)}
                >
                  <Icon size={18} />
                  <span>{meta.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      {blocks.length > 0 && (
        <section className="ed-palette-group">
          <h3 className="ed-panel-heading">Blocks</h3>
          <div className="ed-blocks">
            {blocks.map((block) => (
              <button
                key={block.id}
                type="button"
                className="ed-block"
                draggable
                onDragStart={(e) => startDrag(e, { kind: 'block', blockId: block.id })}
                onDragEnd={endDrag}
                onClick={() => addBlockAtSelection(block)}
              >
                <LayoutTemplate size={16} />
                <span>
                  <strong>{block.label}</strong>
                  <small>{block.description}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      {groups.length === 0 && blocks.length === 0 && <p className="ed-muted">No components match “{query}”.</p>}
    </div>
  )
}
