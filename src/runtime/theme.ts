import type { Theme } from './types'

export interface FontOption {
  label: string
  stack: string
  /** Google Fonts family spec, when the font has to be loaded. */
  google?: string
}

export const FONTS: Record<string, FontOption> = {
  system: {
    label: 'System',
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  inter: { label: 'Inter', stack: '"Inter", system-ui, sans-serif', google: 'Inter:wght@400;500;600;700;800' },
  poppins: { label: 'Poppins', stack: '"Poppins", system-ui, sans-serif', google: 'Poppins:wght@400;500;600;700;800' },
  dmsans: { label: 'DM Sans', stack: '"DM Sans", system-ui, sans-serif', google: 'DM+Sans:wght@400;500;600;700;800' },
  merriweather: { label: 'Merriweather', stack: '"Merriweather", Georgia, serif', google: 'Merriweather:wght@400;700;900' },
  playfair: { label: 'Playfair Display', stack: '"Playfair Display", Georgia, serif', google: 'Playfair+Display:wght@400;600;700;800' },
  georgia: { label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  mono: { label: 'Monospace', stack: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace' },
}

export const DEFAULT_THEME: Theme = {
  primary: '#4f46e5',
  text: '#111827',
  background: '#ffffff',
  font: 'inter',
  radius: '8px',
}

/** Applies theme CSS variables to an app root and loads its web font. */
export function applyTheme(el: HTMLElement, theme: Theme) {
  const font = FONTS[theme.font] ?? FONTS.system
  el.style.setProperty('--nc-primary', theme.primary)
  el.style.setProperty('--nc-text', theme.text)
  el.style.setProperty('--nc-bg', theme.background)
  el.style.setProperty('--nc-font', font.stack)
  el.style.setProperty('--nc-radius', theme.radius)
  if (font.google) loadGoogleFont(el.ownerDocument, font.google)
}

function loadGoogleFont(doc: Document, spec: string) {
  const id = `nc-font-${spec.replace(/[^a-z0-9]/gi, '')}`
  if (doc.getElementById(id)) return
  const link = doc.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`
  doc.head.appendChild(link)
}

export const RUNTIME_CSS = `
.nc-app{--nc-primary:#4f46e5;--nc-text:#111827;--nc-bg:#fff;--nc-font:system-ui,sans-serif;--nc-radius:8px;
container-type:inline-size;font-family:var(--nc-font);color:var(--nc-text);background:var(--nc-bg);
line-height:1.5;-webkit-font-smoothing:antialiased;font-size:16px;text-align:left;display:flex;flex-direction:column}
.nc-app *,.nc-app *::before,.nc-app *::after{box-sizing:border-box}
.nc-page{display:flex;flex-direction:column;flex:1 0 auto}
.nc-section{width:100%;padding:64px 24px}
.nc-section-inner{width:100%;max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.nc-container{display:flex;flex-direction:column;gap:12px;min-width:0}
.nc-row{display:flex;flex-direction:row;gap:24px}
.nc-row>*{flex:1 1 0;min-width:0}
.nc-card{display:flex;flex-direction:column;gap:12px;padding:24px;background:#fff;color:#111827;
border:1px solid rgba(15,23,42,.08);border-radius:min(calc(var(--nc-radius)*1.5),24px);box-shadow:0 1px 3px rgba(15,23,42,.08)}
.nc-repeater{display:flex;flex-direction:column;gap:12px;min-width:0}
.nc-repeater-item{display:flex;flex-direction:column;gap:8px;min-width:0}
.nc-repeater-empty{opacity:.6}
.nc-heading{margin:0;line-height:1.2;font-weight:700;letter-spacing:-.01em}
h1.nc-heading{font-size:48px}h2.nc-heading{font-size:36px}h3.nc-heading{font-size:28px}
h4.nc-heading{font-size:22px}h5.nc-heading{font-size:18px}h6.nc-heading{font-size:16px}
.nc-text{margin:0;white-space:pre-wrap}
.nc-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 22px;width:fit-content;
border-radius:var(--nc-radius);border:1.5px solid transparent;font:inherit;font-weight:600;line-height:1.2;
cursor:pointer;text-decoration:none;transition:filter .15s,transform .15s}
.nc-button:hover{filter:brightness(.93)}.nc-button:active{transform:translateY(1px)}
.nc-button--primary{background:var(--nc-primary);color:#fff}
.nc-button--secondary{background:color-mix(in srgb,var(--nc-primary) 12%,transparent);color:var(--nc-primary)}
.nc-button--outline{background:transparent;border-color:var(--nc-primary);color:var(--nc-primary)}
.nc-button--ghost{background:transparent;color:inherit}
.nc-link{color:var(--nc-primary);text-decoration:none;width:fit-content;font-weight:500;cursor:pointer}
.nc-link:hover{text-decoration:underline}
.nc-image{display:block;max-width:100%;height:auto}
.nc-video{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:min(var(--nc-radius),16px);overflow:hidden}
.nc-video iframe,.nc-video video{position:absolute;inset:0;width:100%;height:100%;border:0}
.nc-list{margin:0;padding-left:1.4em;display:flex;flex-direction:column;gap:6px}
.nc-divider{border:0;border-top:1px solid rgba(15,23,42,.12);margin:8px 0;width:100%}
.nc-spacer{flex-shrink:0}
.nc-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.nc-field-label{font-size:14px;font-weight:500}
.nc-input,.nc-textarea,.nc-select{font:inherit;font-size:15px;padding:10px 12px;width:100%;color:#111827;background:#fff;
border:1px solid rgba(15,23,42,.2);border-radius:var(--nc-radius);outline:none}
.nc-input:focus,.nc-textarea:focus,.nc-select:focus{border-color:var(--nc-primary);
box-shadow:0 0 0 3px color-mix(in srgb,var(--nc-primary) 25%,transparent)}
.nc-textarea{resize:vertical;border-radius:min(var(--nc-radius),16px)}
.nc-checkbox{display:inline-flex;align-items:center;gap:8px;cursor:pointer;width:fit-content}
.nc-checkbox input{width:18px;height:18px;flex:none;accent-color:var(--nc-primary);margin:0}
.nc-clickable{cursor:pointer}
.nc-shadow-none{box-shadow:none}
.nc-shadow-sm{box-shadow:0 1px 3px rgba(15,23,42,.1)}
.nc-shadow-md{box-shadow:0 6px 16px rgba(15,23,42,.12)}
.nc-shadow-lg{box-shadow:0 20px 40px rgba(15,23,42,.16)}
@container (max-width:640px){
.nc-hide-mobile{display:none!important}
.nc-row.nc-stack{flex-direction:column}
.nc-row.nc-stack>*{flex:0 0 auto}
.nc-section{padding:40px 16px}
h1.nc-heading{font-size:34px}h2.nc-heading{font-size:28px}h3.nc-heading{font-size:23px}
}
@container (min-width:641px){.nc-hide-desktop{display:none!important}}
`

export function injectRuntimeStyles(doc: Document) {
  if (doc.getElementById('nc-runtime-styles')) return
  const style = doc.createElement('style')
  style.id = 'nc-runtime-styles'
  style.textContent = RUNTIME_CSS
  doc.head.appendChild(style)
}
