import { createContext, renderNode } from './render'
import { initialState, type State } from './state'
import { applyTheme, injectRuntimeStyles } from './theme'
import type { Page, Project } from './types'

/** Renders a page for the editor canvas: no behaviour, plus data attributes for selection. */
export function renderDesignPage(doc: Document, project: Project, page: Page, state?: State): HTMLElement {
  injectRuntimeStyles(doc)
  const root = doc.createElement('div')
  root.className = 'nc-app nc-design'
  applyTheme(root, project.theme)
  const ctx = createContext({
    doc,
    project,
    mode: 'design',
    state: state ?? initialState(project),
    pageHref: (id) => `#/${project.pages.find((p) => p.id === id)?.path ?? ''}`,
  })
  const el = renderNode(page.root, ctx)
  if (el) root.appendChild(el)
  return root
}
