// Small, shared form controls for the editor panels.

import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { validateExpression } from '../runtime/expression'

interface FieldProps {
  label: string
  help?: ReactNode
  error?: string | null
  children: ReactNode
  wide?: boolean
  /** Render as a group instead of a <label> (for button groups, which a label would click). */
  group?: boolean
}

export function Field({ label, help, error, children, wide, group }: FieldProps) {
  const className = `ed-field${wide ? ' ed-field--wide' : ''}`
  const body = (
    <>
      <span className="ed-field-label">{label}</span>
      {children}
      {error ? <span className="ed-field-error">{error}</span> : help ? <span className="ed-field-help">{help}</span> : null}
    </>
  )
  return group ? (
    <div className={className} role="group" aria-label={label}>
      {body}
    </div>
  ) : (
    <label className={className}>{body}</label>
  )
}

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  mono?: boolean
  multiline?: boolean
  rows?: number
  list?: string
  type?: string
  autoFocus?: boolean
  name?: string
}

export function TextInput({ value, onChange, placeholder, mono, multiline, rows, list, type, autoFocus, name }: TextInputProps) {
  const className = `ed-input${mono ? ' ed-input--mono' : ''}`
  if (multiline) {
    return (
      <textarea
        className={className}
        value={value}
        rows={rows ?? 3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        name={name}
        spellCheck={!mono}
      />
    )
  }
  return (
    <input
      className={className}
      value={value}
      type={type ?? 'text'}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      list={list}
      autoFocus={autoFocus}
      name={name}
      spellCheck={!mono}
    />
  )
}

/** Expression input with live validation. */
export function ExpressionInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const error = value.trim() ? validateExpression(value) : null
  return (
    <>
      <TextInput value={value} onChange={onChange} placeholder={placeholder} mono list="ed-variable-names" />
      {error && <span className="ed-field-error">{error}</span>}
    </>
  )
}

export function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select className="ed-input ed-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="ed-checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

const HEX = /^#[0-9a-f]{6}$/i

function toHex(value: string): string {
  if (HEX.test(value)) return value
  if (/^#[0-9a-f]{3}$/i.test(value)) return `#${value.slice(1).split('').map((c) => c + c).join('')}`
  return '#000000'
}

export function ColorInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const isColor = HEX.test(value) || /^#[0-9a-f]{3}$/i.test(value)
  return (
    <div className="ed-color">
      {/* The text input comes first so a wrapping <label> focuses it, not the picker. */}
      <input className="ed-input ed-input--mono" value={value} placeholder={placeholder ?? 'none'} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      <span className={`ed-color-swatch${value ? '' : ' ed-color-swatch--empty'}`} style={{ background: value || undefined }}>
        <input type="color" value={isColor ? toHex(value) : '#000000'} onChange={(e) => onChange(e.target.value)} aria-label="Pick a color" />
      </span>
    </div>
  )
}

export interface SegmentOption {
  value: string
  label?: string
  icon?: LucideIcon
  title: string
}

export function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: SegmentOption[] }) {
  return (
    <div className="ed-segmented" role="radiogroup">
      {options.map((o) => {
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'is-active' : ''}
            title={o.title}
            onClick={() => onChange(o.value)}
          >
            {Icon ? <Icon size={15} /> : o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Collapsible({ title, children, defaultOpen = true, count }: { title: string; children: ReactNode; defaultOpen?: boolean; count?: number }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className={`ed-group${open ? ' is-open' : ''}`}>
      <button type="button" className="ed-group-title" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <ChevronRight size={14} className="ed-chevron" />
        <span>{title}</span>
        {count ? <span className="ed-badge">{count}</span> : null}
      </button>
      {open && (
        <div className="ed-group-body" id={id}>
          {children}
        </div>
      )}
    </section>
  )
}

interface IconButtonProps {
  icon: LucideIcon
  title: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  danger?: boolean
  label?: string
  size?: number
}

export function IconButton({ icon: Icon, title, onClick, active, disabled, danger, label, size = 16 }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`ed-icon-btn${active ? ' is-active' : ''}${danger ? ' is-danger' : ''}${label ? ' has-label' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={size} />
      {label && <span>{label}</span>}
    </button>
  )
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <div className="ed-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`ed-modal${wide ? ' ed-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <header className="ed-modal-header">
          <h2>{title}</h2>
        </header>
        <div className="ed-modal-body">{children}</div>
        {footer && <footer className="ed-modal-footer">{footer}</footer>}
      </div>
    </div>
  )
}
