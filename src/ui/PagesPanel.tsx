import { Copy, FileText, House, Plus, Trash2 } from 'lucide-react'
import { addPage, deletePage, duplicatePage, setHomePage, updatePage } from '../editor/operations'
import { useEditor } from '../editor/store'
import type { Page } from '../runtime/types'
import { Field, IconButton, TextInput } from './controls'

export function PagesPanel() {
  const project = useEditor((s) => s.project)!
  const pageId = useEditor((s) => s.pageId)
  const setPage = useEditor((s) => s.setPage)
  const current = project.pages.find((p) => p.id === pageId) ?? project.pages[0]

  return (
    <div className="ed-panel-scroll">
      <div className="ed-panel-row">
        <h3 className="ed-panel-heading">Pages</h3>
        <button type="button" className="ed-btn ed-btn--small" onClick={() => addPage()}>
          <Plus size={14} /> New page
        </button>
      </div>
      <ul className="ed-list">
        {project.pages.map((page) => (
          <li key={page.id}>
            <button type="button" className={`ed-list-item${page.id === current.id ? ' is-selected' : ''}`} onClick={() => setPage(page.id)}>
              {page.id === project.homePageId ? <House size={14} /> : <FileText size={14} />}
              <span className="ed-list-name">{page.name}</span>
              <span className="ed-list-meta">/{page.path}</span>
            </button>
          </li>
        ))}
      </ul>
      <h3 className="ed-panel-heading">Page settings</h3>
      <PageSettings page={current} />
    </div>
  )
}

export function PageSettings({ page }: { page: Page }) {
  const project = useEditor((s) => s.project)!
  const isHome = page.id === project.homePageId
  return (
    <div className="ed-fields">
      <Field label="Name">
        <TextInput value={page.name} onChange={(name) => updatePage(page.id, { name })} />
      </Field>
      <Field label="Browser tab title">
        <TextInput value={page.title} onChange={(title) => updatePage(page.id, { title })} />
      </Field>
      <Field label="URL path" help={isHome ? 'This is the home page, shown at the root address.' : `Opens at #/${page.path}`}>
        <TextInput value={isHome ? '' : page.path} onChange={(path) => updatePage(page.id, { path })} placeholder={isHome ? '(home)' : 'about'} mono />
      </Field>
      <div className="ed-button-row">
        {!isHome && (
          <button type="button" className="ed-btn ed-btn--small" onClick={() => setHomePage(page.id)}>
            <House size={14} /> Make home page
          </button>
        )}
        <IconButton icon={Copy} title="Duplicate page" label="Duplicate" onClick={() => duplicatePage(page.id)} />
        <IconButton
          icon={Trash2}
          title="Delete page"
          label="Delete"
          danger
          disabled={project.pages.length <= 1}
          onClick={() => {
            if (confirm(`Delete the page “${page.name}”? You can undo this.`)) deletePage(page.id)
          }}
        />
      </div>
    </div>
  )
}
