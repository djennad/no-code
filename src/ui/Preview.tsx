import { ChevronDown, Monitor, RotateCcw, Smartphone, Tablet, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DEVICE_WIDTHS, useEditor, type Device } from '../editor/store'
import { mount, type AppHandle } from '../runtime/app'
import { IconButton } from './controls'

/** Runs the project for real: actions, variables and page navigation all work. */
export function Preview() {
  const project = useEditor((s) => s.project)!
  const startPage = useEditor((s) => s.pageId)
  const setPreviewing = useEditor((s) => s.setPreviewing)
  const [device, setDevice] = useState<Device>(useEditor.getState().device)
  const [pageId, setPageId] = useState(startPage)
  const [run, setRun] = useState(0)
  const hostRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<AppHandle | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const app = mount(host, project, {
      router: 'memory',
      pageId: startPage,
      onNavigate: (id) => {
        setPageId(id)
        scrollRef.current?.scrollTo({ top: 0 })
      },
    })
    appRef.current = app
    return () => {
      app.destroy()
      appRef.current = null
    }
  }, [project, startPage, run])

  return (
    <div className="ed-preview" role="dialog" aria-label="Preview">
      <header className="ed-preview-bar">
        <div className="ed-topbar-group">
          <span className="ed-preview-dot" />
          <strong>Preview</strong>
          <span className="ed-muted">Everything is interactive here</span>
        </div>
        <div className="ed-topbar-group">
          <label className="ed-page-select">
            <span className="ed-visually-hidden">Page</span>
            <select value={pageId} onChange={(e) => appRef.current?.navigate(e.target.value)}>
              {project.pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <span className="ed-divider" />
          <IconButton icon={Monitor} title="Desktop" active={device === 'desktop'} onClick={() => setDevice('desktop')} />
          <IconButton icon={Tablet} title="Tablet" active={device === 'tablet'} onClick={() => setDevice('tablet')} />
          <IconButton icon={Smartphone} title="Mobile" active={device === 'mobile'} onClick={() => setDevice('mobile')} />
          <span className="ed-divider" />
          <IconButton icon={RotateCcw} title="Restart (reset all variables)" onClick={() => setRun((n) => n + 1)} />
        </div>
        <div className="ed-topbar-group">
          <button type="button" className="ed-btn" onClick={() => setPreviewing(false)}>
            <X size={15} /> Close preview
          </button>
        </div>
      </header>
      <div className="ed-preview-scroll" ref={scrollRef}>
        <div className={`ed-frame ed-frame--${device}`} style={{ width: DEVICE_WIDTHS[device] ?? undefined }}>
          <div ref={hostRef} className="ed-preview-host" />
        </div>
      </div>
    </div>
  )
}
