import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowUp, Copy, MousePointer2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { deleteNode, duplicateNode, setProp, setStyle, updateNode } from '../editor/operations'
import { getMeta, type FieldDef } from '../editor/registry'
import { useCurrentPage, useEditor, useSelectedNode } from '../editor/store'
import { findParent } from '../editor/tree'
import type { NodeData, StyleProps } from '../runtime/types'
import { EventActions } from './ActionsEditor'
import { Checkbox, Collapsible, ColorInput, ExpressionInput, Field, IconButton, Segmented, SelectInput, TextInput } from './controls'
import { PageSettings } from './PagesPanel'

type Tab = 'content' | 'style' | 'actions' | 'advanced'

export function Inspector() {
  const node = useSelectedNode()
  const page = useCurrentPage()
  const select = useEditor((s) => s.select)
  const [tab, setTab] = useState<Tab>('content')

  // Double-clicking a button on the canvas focuses its label field here.
  useEffect(() => {
    const onFocusField = (e: Event) => {
      const key = (e as CustomEvent<string>).detail
      setTab('content')
      requestAnimationFrame(() => {
        const input = document.querySelector<HTMLInputElement>(`.ed-right [name="${CSS.escape(key)}"]`)
        input?.focus()
        input?.select()
      })
    }
    window.addEventListener('nocode:focus-field', onFocusField)
    return () => window.removeEventListener('nocode:focus-field', onFocusField)
  }, [])

  if (!node || !page) return <aside className="ed-right"><EmptyInspector /></aside>

  const meta = getMeta(node.type)
  const isPage = node.type === 'page'
  const tabs: { id: Tab; label: string }[] = [
    ...(meta.fields.length || isPage ? [{ id: 'content' as const, label: 'Content' }] : []),
    { id: 'style', label: 'Style' },
    ...(meta.events.length ? [{ id: 'actions' as const, label: 'Actions' }] : []),
    ...(isPage ? [] : [{ id: 'advanced' as const, label: 'Advanced' }]),
  ]
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0].id
  const parent = findParent(page.root, node.id)
  const Icon = meta.icon
  const actionCount = Object.values(node.events ?? {}).reduce((n, list) => n + (list?.length ?? 0), 0)

  return (
    <aside className="ed-right" aria-label="Inspector">
      <header className="ed-inspector-head">
        <span className="ed-inspector-icon">
          <Icon size={16} />
        </span>
        <div className="ed-inspector-title">
          <strong>{isPage ? page.name : node.name || meta.label}</strong>
          <span>{isPage ? 'Page' : meta.description}</span>
        </div>
        {parent && (
          <div className="ed-inspector-tools">
            <IconButton icon={ArrowUp} title="Select parent" onClick={() => select(parent.parent.id)} />
            <IconButton icon={Copy} title="Duplicate" onClick={() => duplicateNode(node.id)} />
            <IconButton icon={Trash2} title="Delete" danger onClick={() => deleteNode(node.id)} />
          </div>
        )}
      </header>
      <nav className="ed-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={active === t.id} className={active === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'actions' && actionCount > 0 && <span className="ed-badge">{actionCount}</span>}
          </button>
        ))}
      </nav>
      <div className="ed-inspector-body" key={node.id}>
        {active === 'content' && (isPage ? <PageSettings page={page} /> : <ContentFields node={node} fields={meta.fields} />)}
        {active === 'style' && <StyleFields node={node} />}
        {active === 'actions' && meta.events.map((ev) => <EventActions key={ev.name} node={node} event={ev.name} label={ev.label} />)}
        {active === 'advanced' && <AdvancedFields node={node} />}
      </div>
    </aside>
  )
}

function EmptyInspector() {
  return (
    <div className="ed-empty-inspector">
      <MousePointer2 size={28} />
      <h3>Nothing selected</h3>
      <p>Click an element on the canvas to edit its content, style and actions.</p>
      <ul className="ed-tips">
        <li>Drag components from the left panel onto the page.</li>
        <li>Double-click text to edit it in place.</li>
        <li>
          Use <code>{'{{variable}}'}</code> in any text to show data.
        </li>
      </ul>
      <dl className="ed-shortcuts">
        <dt>Ctrl Z / Ctrl Shift Z</dt>
        <dd>Undo / redo</dd>
        <dt>Ctrl D</dt>
        <dd>Duplicate</dd>
        <dt>Ctrl C / Ctrl V</dt>
        <dd>Copy / paste</dd>
        <dt>Delete</dt>
        <dd>Remove element</dd>
        <dt>Esc</dt>
        <dd>Select parent</dd>
      </dl>
    </div>
  )
}

function ContentFields({ node, fields }: { node: NodeData; fields: FieldDef[] }) {
  const pages = useEditor((s) => s.project!.pages)
  return (
    <div className="ed-fields">
      {fields
        .filter((f) => !f.showIf || f.showIf(node.props))
        .map((f) => {
          const raw = node.props[f.key]
          const value = typeof raw === 'string' ? raw : raw === undefined || raw === null ? '' : String(raw)
          const set = (v: unknown) => setProp(node.id, f.key, v)
          switch (f.kind) {
            case 'checkbox':
              return <Checkbox key={f.key} checked={raw !== false && raw !== undefined && raw !== ''} onChange={set} label={f.label} />
            case 'select':
              return (
                <Field key={f.key} label={f.label} help={f.help}>
                  <SelectInput value={value} onChange={set} options={f.options ?? []} />
                </Field>
              )
            case 'page':
              return (
                <Field key={f.key} label={f.label} help={f.help}>
                  <SelectInput value={value} onChange={set} options={[{ value: '', label: 'Choose a page…' }, ...pages.map((p) => ({ value: p.id, label: p.name }))]} />
                </Field>
              )
            case 'expression':
              return (
                <Field key={f.key} label={f.label} help={f.help}>
                  <ExpressionInput value={value} onChange={set} placeholder={f.placeholder} />
                </Field>
              )
            default:
              return (
                <Field key={f.key} label={f.label} help={f.help}>
                  <TextInput
                    name={f.key}
                    value={value}
                    onChange={set}
                    placeholder={f.placeholder}
                    multiline={f.kind === 'textarea'}
                    rows={f.kind === 'textarea' ? 4 : undefined}
                    type={f.kind === 'number' ? 'number' : undefined}
                    mono={f.kind === 'variable'}
                    list={f.kind === 'variable' ? 'ed-variable-names' : undefined}
                  />
                </Field>
              )
          }
        })}
    </div>
  )
}

const WEIGHTS = [
  { value: '', label: 'Default' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra bold' },
]

function count(style: StyleProps, keys: (keyof StyleProps)[]) {
  return keys.filter((k) => style[k] !== undefined && style[k] !== '' && style[k] !== false).length
}

function StyleFields({ node }: { node: NodeData }) {
  const s = node.style
  const meta = getMeta(node.type)
  const str = (key: keyof StyleProps) => (typeof s[key] === 'string' ? (s[key] as string) : '')
  const set = (key: keyof StyleProps) => (value: string | boolean) => setStyle(node.id, key, value as never)
  const text = (key: keyof StyleProps, label: string, placeholder?: string) => (
    <Field label={label}>
      <TextInput value={str(key)} onChange={set(key)} placeholder={placeholder} />
    </Field>
  )

  return (
    <div className="ed-style">
      {meta.container && (
        <Collapsible title="Layout" count={count(s, ['direction', 'gap', 'alignItems', 'justifyContent', 'wrap'])}>
          {node.type !== 'row' && (
            <Field label="Direction" group>
              <Segmented
                value={str('direction') || 'column'}
                onChange={(v) => setStyle(node.id, 'direction', v === 'column' ? undefined : (v as 'row'))}
                options={[
                  { value: 'column', label: '↓ Vertical', title: 'Stack items vertically' },
                  { value: 'row', label: '→ Horizontal', title: 'Place items side by side' },
                ]}
              />
            </Field>
          )}
          <Field label="Align items" group>
            <Segmented
              value={str('alignItems') || 'stretch'}
              onChange={(v) => setStyle(node.id, 'alignItems', v === 'stretch' ? undefined : (v as StyleProps['alignItems']))}
              options={[
                { value: 'stretch', label: 'Fill', title: 'Stretch items' },
                { value: 'flex-start', label: 'Start', title: 'Align to start' },
                { value: 'center', label: 'Center', title: 'Center items' },
                { value: 'flex-end', label: 'End', title: 'Align to end' },
              ]}
            />
          </Field>
          <div className="ed-grid-2">
            <Field label="Distribute">
              <SelectInput
                value={str('justifyContent')}
                onChange={set('justifyContent')}
                options={[
                  { value: '', label: 'Start' },
                  { value: 'center', label: 'Center' },
                  { value: 'flex-end', label: 'End' },
                  { value: 'space-between', label: 'Space between' },
                  { value: 'space-around', label: 'Space around' },
                ]}
              />
            </Field>
            {text('gap', 'Gap', 'e.g. 16')}
          </div>
          <Checkbox checked={!!s.wrap} onChange={set('wrap')} label="Wrap onto multiple lines" />
        </Collapsible>
      )}

      <Collapsible title="Spacing" count={count(s, ['padding', 'margin'])}>
        <div className="ed-grid-2">
          {text('padding', 'Padding', 'e.g. 16 or 8 24')}
          {text('margin', 'Margin', 'e.g. 0 auto')}
        </div>
      </Collapsible>

      <Collapsible title="Size" count={count(s, ['width', 'maxWidth', 'height', 'minHeight', 'flex'])}>
        <div className="ed-grid-2">
          {text('width', 'Width', 'auto, 100%, 320')}
          {text('maxWidth', 'Max width', 'none')}
          {text('height', 'Height', 'auto')}
          {text('minHeight', 'Min height', 'none')}
        </div>
        <Checkbox checked={str('flex') === '1'} onChange={(v) => setStyle(node.id, 'flex', v ? '1' : undefined)} label="Grow to fill available space" />
      </Collapsible>

      <Collapsible title="Text" count={count(s, ['fontSize', 'fontWeight', 'color', 'textAlign', 'lineHeight', 'letterSpacing'])}>
        <div className="ed-grid-2">
          {text('fontSize', 'Size', 'e.g. 18')}
          <Field label="Weight">
            <SelectInput value={str('fontWeight')} onChange={set('fontWeight')} options={WEIGHTS} />
          </Field>
        </div>
        <Field label="Color">
          <ColorInput value={str('color')} onChange={set('color')} placeholder="inherit" />
        </Field>
        <Field label="Alignment" group>
          <Segmented
            value={str('textAlign')}
            onChange={(v) => setStyle(node.id, 'textAlign', str('textAlign') === v ? undefined : (v as StyleProps['textAlign']))}
            options={[
              { value: 'left', icon: AlignLeft, title: 'Left' },
              { value: 'center', icon: AlignCenter, title: 'Center' },
              { value: 'right', icon: AlignRight, title: 'Right' },
              { value: 'justify', icon: AlignJustify, title: 'Justify' },
            ]}
          />
        </Field>
        <div className="ed-grid-2">
          {text('lineHeight', 'Line height', 'e.g. 1.5')}
          {text('letterSpacing', 'Letter spacing', 'e.g. 0.5')}
        </div>
      </Collapsible>

      <Collapsible title="Background" count={count(s, ['background', 'backgroundImage'])}>
        <Field label="Color or gradient">
          <ColorInput value={str('background')} onChange={set('background')} />
        </Field>
        <Field label="Image URL">
          <TextInput value={str('backgroundImage')} onChange={set('backgroundImage')} placeholder="https://…" />
        </Field>
      </Collapsible>

      <Collapsible title="Border & shadow" count={count(s, ['borderWidth', 'borderColor', 'borderRadius', 'shadow'])} defaultOpen={false}>
        <div className="ed-grid-2">
          {text('borderWidth', 'Border width', '0')}
          {text('borderRadius', 'Corner radius', 'e.g. 8')}
        </div>
        <Field label="Border color">
          <ColorInput value={str('borderColor')} onChange={set('borderColor')} />
        </Field>
        <Field label="Shadow" group>
          <Segmented
            value={str('shadow')}
            onChange={(v) => setStyle(node.id, 'shadow', str('shadow') === v ? undefined : (v as StyleProps['shadow']))}
            options={[
              { value: 'none', label: 'None', title: 'No shadow' },
              { value: 'sm', label: 'S', title: 'Small' },
              { value: 'md', label: 'M', title: 'Medium' },
              { value: 'lg', label: 'L', title: 'Large' },
            ]}
          />
        </Field>
      </Collapsible>

      <Collapsible title="Effects" count={count(s, ['opacity'])} defaultOpen={false}>
        {text('opacity', 'Opacity', '0 – 1')}
      </Collapsible>
      <p className="ed-muted ed-hint">Tip: style values accept {'{{expressions}}'}, e.g. {"{{done ? '#999' : '#111'}}"}.</p>
    </div>
  )
}

function AdvancedFields({ node }: { node: NodeData }) {
  const set = <K extends keyof NodeData>(key: K, value: NodeData[K]) =>
    updateNode(node.id, (n) => {
      if (value === undefined || value === '' || value === 'none') delete n[key]
      else n[key] = value
    }, `node:${node.id}:${key}`)
  return (
    <div className="ed-fields">
      <Field label="Layer name" help="Shown in the layers panel">
        <TextInput value={node.name ?? ''} onChange={(v) => set('name', v)} placeholder={getMeta(node.type).label} />
      </Field>
      <Field label="Show only when" help="An expression, e.g. loggedIn or items.length > 0. Leave empty to always show.">
        <ExpressionInput value={node.visibleIf ?? ''} onChange={(v) => set('visibleIf', v)} placeholder="always visible" />
      </Field>
      <Field label="Hide on" group>
        <Segmented
          value={node.hideOn ?? 'none'}
          onChange={(v) => set('hideOn', v as NodeData['hideOn'])}
          options={[
            { value: 'none', label: 'Never', title: 'Visible on every device' },
            { value: 'mobile', label: 'Mobile', title: 'Hidden on narrow screens' },
            { value: 'desktop', label: 'Desktop', title: 'Hidden on wide screens' },
          ]}
        />
      </Field>
      <Field label="Anchor ID" help="Links to #this-id scroll here">
        <TextInput value={node.anchor ?? ''} onChange={(v) => set('anchor', v.replace(/[^\w-]/g, ''))} placeholder="e.g. pricing" mono />
      </Field>
      <Field label="Element ID">
        <input className="ed-input ed-input--mono" value={node.id} readOnly />
      </Field>
    </div>
  )
}
