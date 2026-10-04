import { renameProject, updateTheme } from '../editor/operations'
import { useEditor } from '../editor/store'
import { FONTS } from '../runtime/theme'
import { ColorInput, Field, SelectInput, TextInput } from './controls'

const PALETTES = [
  { name: 'Indigo', primary: '#4f46e5', text: '#111827', background: '#ffffff' },
  { name: 'Emerald', primary: '#059669', text: '#0f172a', background: '#ffffff' },
  { name: 'Sunset', primary: '#ea580c', text: '#1c1917', background: '#fffbf5' },
  { name: 'Rose', primary: '#e11d48', text: '#1f2937', background: '#fff7f9' },
  { name: 'Ocean', primary: '#0284c7', text: '#0f172a', background: '#f8fafc' },
  { name: 'Midnight', primary: '#a78bfa', text: '#e5e7eb', background: '#0b1020' },
]

export function ThemePanel() {
  const project = useEditor((s) => s.project)!
  const theme = project.theme
  return (
    <div className="ed-panel-scroll">
      <h3 className="ed-panel-heading">Project</h3>
      <div className="ed-fields">
        <Field label="Project name">
          <TextInput value={project.name} onChange={renameProject} />
        </Field>
      </div>
      <h3 className="ed-panel-heading">Color presets</h3>
      <div className="ed-presets">
        {PALETTES.map((p) => (
          <button
            key={p.name}
            type="button"
            className="ed-preset"
            title={p.name}
            onClick={() => updateTheme({ primary: p.primary, text: p.text, background: p.background })}
            style={{ background: p.background, color: p.text }}
          >
            <span style={{ background: p.primary }} />
            {p.name}
          </button>
        ))}
      </div>
      <h3 className="ed-panel-heading">Theme</h3>
      <div className="ed-fields">
        <Field label="Brand color" help="Used by buttons, links and accents">
          <ColorInput value={theme.primary} onChange={(primary) => updateTheme({ primary })} />
        </Field>
        <Field label="Text color">
          <ColorInput value={theme.text} onChange={(text) => updateTheme({ text })} />
        </Field>
        <Field label="Page background">
          <ColorInput value={theme.background} onChange={(background) => updateTheme({ background })} />
        </Field>
        <Field label="Font">
          <SelectInput value={theme.font} onChange={(font) => updateTheme({ font })} options={Object.entries(FONTS).map(([value, f]) => ({ value, label: f.label }))} />
        </Field>
        <Field label="Corner radius" help="Buttons, inputs and cards">
          <SelectInput
            value={theme.radius}
            onChange={(radius) => updateTheme({ radius })}
            options={[
              { value: '0px', label: 'Square' },
              { value: '4px', label: 'Small' },
              { value: '8px', label: 'Medium' },
              { value: '14px', label: 'Large' },
              { value: '999px', label: 'Pill' },
            ]}
          />
        </Field>
      </div>
    </div>
  )
}
