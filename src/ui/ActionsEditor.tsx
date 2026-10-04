import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { uid } from '../editor/id'
import { setEventActions } from '../editor/operations'
import { useEditor } from '../editor/store'
import type { Action, ActionType, EventName, NodeData, Page } from '../runtime/types'
import { Checkbox, ExpressionInput, Field, IconButton, SelectInput, TextInput } from './controls'

export const ACTION_TYPES: { type: ActionType; label: string; description: string; create: () => Action }[] = [
  { type: 'navigate', label: 'Go to page', description: 'Open another page of this project', create: () => ({ id: uid('a'), type: 'navigate', pageId: '' }) },
  { type: 'openUrl', label: 'Open web address', description: 'Open a link', create: () => ({ id: uid('a'), type: 'openUrl', url: 'https://', newTab: true }) },
  { type: 'setVariable', label: 'Set variable', description: 'Store a value', create: () => ({ id: uid('a'), type: 'setVariable', variable: '', value: '' }) },
  { type: 'increment', label: 'Add to number', description: 'Increase or decrease a number', create: () => ({ id: uid('a'), type: 'increment', variable: '', amount: '1' }) },
  { type: 'toggle', label: 'Toggle true/false', description: 'Flip a yes/no value', create: () => ({ id: uid('a'), type: 'toggle', variable: '' }) },
  { type: 'appendToList', label: 'Add item to list', description: 'Push a value onto a list', create: () => ({ id: uid('a'), type: 'appendToList', variable: '', value: '' }) },
  { type: 'removeFromList', label: 'Remove item from list', description: 'Delete by position', create: () => ({ id: uid('a'), type: 'removeFromList', variable: '', index: '{{index}}' }) },
  { type: 'alert', label: 'Show message', description: 'Pop-up message', create: () => ({ id: uid('a'), type: 'alert', message: 'Hello!' }) },
  {
    type: 'fetch',
    label: 'Call an API',
    description: 'Load or send data over HTTP',
    create: () => ({ id: uid('a'), type: 'fetch', method: 'GET', url: 'https://', body: '', resultVariable: '', errorVariable: '' }),
  },
]

const NO_PAGES: Page[] = []

const LABELS = Object.fromEntries(ACTION_TYPES.map((a) => [a.type, a.label])) as Record<ActionType, string>

export function EventActions({ node, event, label }: { node: NodeData; event: EventName; label: string }) {
  const actions = node.events?.[event] ?? []
  const [adding, setAdding] = useState(false)
  const save = (next: Action[], key?: string) => setEventActions(node.id, event, next, key)

  const change = (index: number, patch: Partial<Action>) => {
    const next = actions.map((a, i) => (i === index ? ({ ...a, ...patch } as Action) : a))
    save(next, `action:${actions[index].id}:${Object.keys(patch).join()}`)
  }
  const move = (index: number, delta: number) => {
    const next = actions.slice()
    const [a] = next.splice(index, 1)
    next.splice(index + delta, 0, a)
    save(next)
  }

  return (
    <div className="ed-event">
      <div className="ed-event-title">{label}</div>
      {actions.length === 0 && <p className="ed-muted">No actions yet.</p>}
      <ol className="ed-actions">
        {actions.map((action, i) => (
          <li key={action.id} className="ed-action">
            <div className="ed-action-head">
              <span className="ed-action-num">{i + 1}</span>
              <strong>{LABELS[action.type]}</strong>
              <span className="ed-spacer" />
              <IconButton icon={ArrowUp} title="Move up" size={14} disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon={ArrowDown} title="Move down" size={14} disabled={i === actions.length - 1} onClick={() => move(i, 1)} />
              <IconButton icon={Trash2} title="Remove action" size={14} danger onClick={() => save(actions.filter((_, j) => j !== i))} />
            </div>
            <ActionFields action={action} onChange={(patch) => change(i, patch)} />
            <Field label="Only if (optional)" help="Skip this action unless the condition is true, e.g. email != ''">
              <ExpressionInput value={action.condition ?? ''} onChange={(v) => change(i, { condition: v })} placeholder="always" />
            </Field>
          </li>
        ))}
      </ol>
      {adding ? (
        <div className="ed-action-picker">
          {ACTION_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => {
                save([...actions, t.create()])
                setAdding(false)
              }}
            >
              <strong>{t.label}</strong>
              <span>{t.description}</span>
            </button>
          ))}
          <button type="button" className="ed-link-btn" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="ed-btn ed-btn--dashed" onClick={() => setAdding(true)}>
          <Plus size={14} /> Add action
        </button>
      )}
    </div>
  )
}

function VariableField({ label, value, onChange, help }: { label: string; value: string; onChange: (v: string) => void; help?: string }) {
  return (
    <Field label={label} help={help}>
      <TextInput value={value} onChange={onChange} list="ed-variable-names" mono placeholder="variable name" />
    </Field>
  )
}

function ActionFields({ action, onChange }: { action: Action; onChange: (patch: Partial<Action>) => void }) {
  const pages = useEditor((s) => s.project?.pages ?? NO_PAGES)
  switch (action.type) {
    case 'navigate':
      return (
        <Field label="Page">
          <SelectInput
            value={action.pageId}
            onChange={(pageId) => onChange({ pageId })}
            options={[{ value: '', label: 'Choose a page…' }, ...pages.map((p) => ({ value: p.id, label: p.name }))]}
          />
        </Field>
      )
    case 'openUrl':
      return (
        <>
          <Field label="URL">
            <TextInput value={action.url} onChange={(url) => onChange({ url })} placeholder="https://" />
          </Field>
          <Checkbox checked={action.newTab} onChange={(newTab) => onChange({ newTab })} label="Open in a new tab" />
        </>
      )
    case 'setVariable':
      return (
        <>
          <VariableField label="Variable" value={action.variable} onChange={(variable) => onChange({ variable })} help="Paths work too: user.name or todos.{{index}}.done" />
          <Field label="Value" help="Text, {{expression}} or JSON">
            <TextInput value={action.value} onChange={(value) => onChange({ value })} mono />
          </Field>
        </>
      )
    case 'increment':
      return (
        <>
          <VariableField label="Number variable" value={action.variable} onChange={(variable) => onChange({ variable })} />
          <Field label="Amount" help="Use a negative number to subtract">
            <TextInput value={action.amount} onChange={(amount) => onChange({ amount })} mono />
          </Field>
        </>
      )
    case 'toggle':
      return <VariableField label="Variable" value={action.variable} onChange={(variable) => onChange({ variable })} />
    case 'appendToList':
      return (
        <>
          <VariableField label="List variable" value={action.variable} onChange={(variable) => onChange({ variable })} />
          <Field label="Item" help='Text, {{expression}} or JSON like {"title": "{{newTodo}}"}'>
            <TextInput value={action.value} onChange={(value) => onChange({ value })} mono multiline rows={2} />
          </Field>
        </>
      )
    case 'removeFromList':
      return (
        <>
          <VariableField label="List variable" value={action.variable} onChange={(variable) => onChange({ variable })} />
          <Field label="Position" help="Inside a repeater, {{index}} is the current item">
            <TextInput value={action.index} onChange={(index) => onChange({ index })} mono />
          </Field>
        </>
      )
    case 'alert':
      return (
        <Field label="Message">
          <TextInput value={action.message} onChange={(message) => onChange({ message })} multiline rows={2} />
        </Field>
      )
    case 'fetch':
      return (
        <>
          <div className="ed-grid-2">
            <Field label="Method">
              <SelectInput
                value={action.method}
                onChange={(method) => onChange({ method: method as typeof action.method })}
                options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m }))}
              />
            </Field>
          </div>
          <Field label="URL">
            <TextInput value={action.url} onChange={(url) => onChange({ url })} placeholder="https://api.example.com/items" mono />
          </Field>
          {action.method !== 'GET' && (
            <Field label="Body (JSON)">
              <TextInput value={action.body} onChange={(body) => onChange({ body })} mono multiline rows={3} placeholder='{"name": "{{name}}"}' />
            </Field>
          )}
          <VariableField label="Save response to" value={action.resultVariable} onChange={(resultVariable) => onChange({ resultVariable })} />
          <VariableField label="Save error message to" value={action.errorVariable ?? ''} onChange={(errorVariable) => onChange({ errorVariable })} />
        </>
      )
  }
}
