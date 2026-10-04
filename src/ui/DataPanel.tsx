import { Plus, Trash2 } from 'lucide-react'
import { addVariable, deleteVariable, updateVariable } from '../editor/operations'
import { useEditor } from '../editor/store'
import type { Variable, VariableType } from '../runtime/types'
import { Field, IconButton, SelectInput, TextInput } from './controls'

const TYPES: { value: VariableType; label: string }[] = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'True / false' },
  { value: 'json', label: 'List or object (JSON)' },
]

function jsonError(text: string): string | null {
  if (!text.trim()) return null
  try {
    JSON.parse(text)
    return null
  } catch (err) {
    return `Invalid JSON: ${(err as Error).message}`
  }
}

export function DataPanel() {
  const variables = useEditor((s) => s.project!.variables)
  return (
    <div className="ed-panel-scroll">
      <div className="ed-panel-row">
        <h3 className="ed-panel-heading">Variables</h3>
        <button type="button" className="ed-btn ed-btn--small" onClick={() => addVariable()}>
          <Plus size={14} /> Add
        </button>
      </div>
      <p className="ed-muted ed-hint">
        Variables hold your app's data. Show them in any text with <code>{'{{name}}'}</code>, save form input into them, and change them with actions.
      </p>
      {variables.length === 0 && (
        <div className="ed-empty-small">
          No variables yet. Add one to start building interactive pages.
        </div>
      )}
      {variables.map((v) => (
        <VariableCard key={v.id} variable={v} duplicate={variables.filter((x) => x.name === v.name).length > 1} />
      ))}
    </div>
  )
}

function VariableCard({ variable: v, duplicate }: { variable: Variable; duplicate: boolean }) {
  const nameError = !v.name ? 'A name is required.' : duplicate ? 'Another variable has this name.' : null
  return (
    <div className="ed-card">
      <div className="ed-card-row">
        <Field label="Name" error={nameError}>
          <TextInput value={v.name} onChange={(name) => updateVariable(v.id, { name: name.replace(/[^\w$]/g, '').replace(/^\d+/, '') })} mono />
        </Field>
        <IconButton icon={Trash2} title={`Delete ${v.name}`} danger onClick={() => deleteVariable(v.id)} />
      </div>
      <Field label="Type">
        <SelectInput value={v.type} onChange={(type) => updateVariable(v.id, { type: type as VariableType })} options={TYPES} />
      </Field>
      {v.type === 'boolean' ? (
        <Field label="Starts as">
          <SelectInput
            value={v.initial.trim().toLowerCase() === 'true' ? 'true' : 'false'}
            onChange={(initial) => updateVariable(v.id, { initial })}
            options={[
              { value: 'false', label: 'false' },
              { value: 'true', label: 'true' },
            ]}
          />
        </Field>
      ) : (
        <Field label="Starts as" error={v.type === 'json' ? jsonError(v.initial) : null} help={v.type === 'json' ? 'e.g. [] or [{"title": "Milk"}]' : undefined}>
          <TextInput
            value={v.initial}
            onChange={(initial) => updateVariable(v.id, { initial })}
            mono={v.type !== 'string'}
            multiline={v.type === 'json'}
            rows={v.type === 'json' ? 4 : undefined}
            type={v.type === 'number' ? 'number' : undefined}
          />
        </Field>
      )}
    </div>
  )
}
