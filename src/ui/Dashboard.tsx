import { Copy, Download, Plus, Sparkles, Trash2, Upload } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { exportProjectJson } from '../editor/exporter'
import { uid } from '../editor/id'
import { deleteProject, listProjects, loadProject, parseProject, saveProject } from '../editor/storage'
import { TEMPLATES } from '../editor/templates'
import { homePage } from '../runtime/app'
import { renderDesignPage } from '../runtime/design'
import type { Project } from '../runtime/types'
import { Field, IconButton, Modal, TextInput } from './controls'

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return new Date(ts).toLocaleDateString()
}

/** Scaled-down rendering of a project's home page. */
function Thumbnail({ project }: { project: Project }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    ref.current?.replaceChildren(renderDesignPage(document, project, homePage(project)))
  }, [project])
  return (
    <div className="db-thumb" aria-hidden="true">
      <div className="db-thumb-inner" ref={ref} />
    </div>
  )
}

export function Dashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const [projects, setProjects] = useState(() => listProjects().map((p) => loadProject(p.id)).filter((p): p is Project => !!p))
  const [creating, setCreating] = useState(projects.length === 0)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => setProjects(listProjects().map((p) => loadProject(p.id)).filter((p): p is Project => !!p))

  const create = (project: Project) => {
    if (!saveProject(project)) {
      setError('Your browser storage is full. Delete a project and try again.')
      return
    }
    onOpen(project.id)
  }

  const duplicate = (project: Project) => {
    const copy = { ...structuredClone(project), id: uid('prj'), name: `${project.name} copy`, createdAt: Date.now(), updatedAt: Date.now() }
    saveProject(copy)
    refresh()
  }

  const importFile = async (file: File) => {
    try {
      create(parseProject(JSON.parse(await file.text()), true))
    } catch (err) {
      setError(err instanceof SyntaxError ? 'That file is not valid JSON.' : (err as Error).message)
    }
  }

  return (
    <div className="db">
      <header className="db-header">
        <div className="db-brand">
          <span className="db-logo">
            <Sparkles size={18} />
          </span>
          <span>No-Code Studio</span>
        </div>
        <div className="db-actions">
          <button type="button" className="ed-btn" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importFile(file)
              e.target.value = ''
            }}
          />
          <button type="button" className="ed-btn ed-btn--primary" onClick={() => setCreating(true)}>
            <Plus size={15} /> New project
          </button>
        </div>
      </header>

      <main className="db-main">
        <section className="db-intro">
          <h1>Build websites and apps visually</h1>
          <p>Drag and drop components, connect data with variables and actions, preview instantly and export a ready-to-host website.</p>
        </section>

        {error && (
          <div className="db-error" role="alert">
            {error}
            <button type="button" className="ed-link-btn" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <h2 className="db-section-title">Your projects</h2>
        {projects.length === 0 ? (
          <div className="db-empty">
            <p>No projects yet.</p>
            <button type="button" className="ed-btn ed-btn--primary" onClick={() => setCreating(true)}>
              <Plus size={15} /> Create your first project
            </button>
          </div>
        ) : (
          <div className="db-grid">
            {projects.map((p) => (
              <article key={p.id} className="db-card">
                <button type="button" className="db-card-open" onClick={() => onOpen(p.id)} aria-label={`Open ${p.name}`}>
                  <Thumbnail project={p} />
                </button>
                <div className="db-card-body">
                  <div>
                    <h3>{p.name}</h3>
                    <p>
                      {p.pages.length} page{p.pages.length === 1 ? '' : 's'} · edited {timeAgo(p.updatedAt)}
                    </p>
                  </div>
                  <div className="db-card-tools">
                    <IconButton icon={Copy} title="Duplicate" onClick={() => duplicate(p)} />
                    <IconButton icon={Download} title="Download backup (.json)" onClick={() => exportProjectJson(p)} />
                    <IconButton
                      icon={Trash2}
                      title="Delete"
                      danger
                      onClick={() => {
                        if (confirm(`Delete “${p.name}”? This cannot be undone.`)) {
                          deleteProject(p.id)
                          refresh()
                        }
                      }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {creating && <NewProjectDialog onClose={() => setCreating(false)} onCreate={create} />}
    </div>
  )
}

function NewProjectDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Project) => void }) {
  const [name, setName] = useState('My website')
  const [templateId, setTemplateId] = useState('landing')
  const submit = () => {
    const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]
    onCreate(template.create(name.trim() || 'Untitled'))
  }
  return (
    <Modal
      title="Create a project"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="ed-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ed-btn ed-btn--primary" onClick={submit}>
            Create project
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="Project name">
          <TextInput value={name} onChange={setName} autoFocus />
        </Field>
        <div className="db-templates" role="radiogroup" aria-label="Template">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={templateId === t.id}
              className={`db-template${templateId === t.id ? ' is-selected' : ''}`}
              onClick={() => setTemplateId(t.id)}
              onDoubleClick={() => {
                setTemplateId(t.id)
                onCreate(t.create(name.trim() || 'Untitled'))
              }}
            >
              <TemplatePreview id={t.id} />
              <strong>{t.name}</strong>
              <span>{t.description}</span>
            </button>
          ))}
        </div>
      </form>
    </Modal>
  )
}

function TemplatePreview({ id }: { id: string }) {
  const [project] = useState(() => TEMPLATES.find((t) => t.id === id)!.create('Preview'))
  return <Thumbnail project={project} />
}
