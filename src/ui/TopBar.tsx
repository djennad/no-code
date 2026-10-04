import { ChevronDown, Download, FileCode, FileJson, LayoutGrid, Monitor, Play, Redo2, Smartphone, Tablet, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { exportProjectJson, exportSite } from '../editor/exporter'
import { renameProject } from '../editor/operations'
import { useEditor } from '../editor/store'
import { IconButton } from './controls'

export type SaveStatus = 'saved' | 'saving' | 'error'

export function TopBar({ status, onExit }: { status: SaveStatus; onExit: () => void }) {
  const project = useEditor((s) => s.project)!
  const pageId = useEditor((s) => s.pageId)
  const setPage = useEditor((s) => s.setPage)
  const device = useEditor((s) => s.device)
  const setDevice = useEditor((s) => s.setDevice)
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)
  const setPreviewing = useEditor((s) => s.setPreviewing)

  return (
    <header className="ed-topbar">
      <div className="ed-topbar-group">
        <IconButton icon={LayoutGrid} title="All projects" onClick={onExit} />
        <input className="ed-project-name" value={project.name} onChange={(e) => renameProject(e.target.value)} aria-label="Project name" />
        <span className={`ed-save ed-save--${status}`}>{status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Not saved — storage full'}</span>
      </div>

      <div className="ed-topbar-group ed-topbar-center">
        <label className="ed-page-select">
          <span className="ed-visually-hidden">Page</span>
          <select value={pageId} onChange={(e) => setPage(e.target.value)}>
            {project.pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <span className="ed-divider" />
        <IconButton icon={Undo2} title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo} />
        <IconButton icon={Redo2} title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo} />
        <span className="ed-divider" />
        <IconButton icon={Monitor} title="Desktop view" active={device === 'desktop'} onClick={() => setDevice('desktop')} />
        <IconButton icon={Tablet} title="Tablet view (768px)" active={device === 'tablet'} onClick={() => setDevice('tablet')} />
        <IconButton icon={Smartphone} title="Mobile view (390px)" active={device === 'mobile'} onClick={() => setDevice('mobile')} />
      </div>

      <div className="ed-topbar-group ed-topbar-end">
        <ExportMenu />
        <button type="button" className="ed-btn ed-btn--primary" onClick={() => setPreviewing(true)}>
          <Play size={15} /> Preview
        </button>
      </div>
    </header>
  )
}

function ExportMenu() {
  const project = useEditor((s) => s.project)!
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="ed-menu" ref={ref}>
      <button type="button" className="ed-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Download size={15} /> Export
      </button>
      {open && (
        <div className="ed-menu-list" role="menu">
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await exportSite(project)
              } catch (err) {
                alert(`Export failed: ${(err as Error).message}`)
              } finally {
                setBusy(false)
                setOpen(false)
              }
            }}
          >
            <FileCode size={16} />
            <span>
              <strong>{busy ? 'Preparing…' : 'Website (.html)'}</strong>
              <small>One file with every page. Upload it to any web host.</small>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              exportProjectJson(project)
              setOpen(false)
            }}
          >
            <FileJson size={16} />
            <span>
              <strong>Project backup (.json)</strong>
              <small>Re-import it later from the projects screen.</small>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
