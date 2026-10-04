import { afterEach, describe, expect, it, vi } from 'vitest'
import { TEMPLATES } from '../../editor/templates'
import { mount, resolveJsonTemplate, type AppHandle } from '../app'
import { renderDesignPage } from '../design'
import type { Project } from '../types'

const template = (id: string) => TEMPLATES.find((t) => t.id === id)!.create('Test')
const flush = () => new Promise((r) => setTimeout(r, 0))

let app: AppHandle | null = null
let host: HTMLElement

function start(project: Project, router: 'memory' | 'hash' = 'memory') {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = mount(host, project, { router })
  return app
}

afterEach(() => {
  app?.destroy()
  app = null
  host?.remove()
  vi.restoreAllMocks()
})

function type(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('live runtime', () => {
  it('runs the task app: add, toggle and remove items', async () => {
    const a = start(template('todo'))
    const boxes = () => host.querySelectorAll<HTMLInputElement>('.nc-checkbox input')
    expect(boxes()).toHaveLength(3)
    expect(host.textContent).toContain('3 tasks in your list')

    const input = host.querySelector<HTMLInputElement>('.nc-input')!
    type(input, 'Write tests')
    expect(a.state.newTodo).toBe('Write tests')
    await flush()

    const fresh = host.querySelector<HTMLInputElement>('.nc-input')!
    fresh.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flush()
    expect(a.state.todos).toHaveLength(4)
    expect((a.state.todos as { title: string }[])[3]).toEqual({ title: 'Write tests', done: false })
    expect(a.state.newTodo).toBe('')
    expect(boxes()).toHaveLength(4)

    // Empty input: the condition prevents adding a blank task.
    host.querySelector<HTMLButtonElement>('.nc-button--primary')!.click()
    await flush()
    expect(a.state.todos).toHaveLength(4)

    boxes()[1].click()
    await flush()
    expect((a.state.todos as { done: boolean }[])[1].done).toBe(true)

    host.querySelectorAll<HTMLButtonElement>('.nc-button--ghost')[0].click()
    await flush()
    expect((a.state.todos as { title: string }[]).map((t) => t.title)).toEqual([
      'Drag a component onto the page',
      'Publish my first app',
      'Write tests',
    ])
  })

  it('keeps focus in an input while re-rendering', async () => {
    start(template('todo'))
    const input = host.querySelector<HTMLInputElement>('.nc-input')!
    input.focus()
    type(input, 'abc')
    await flush()
    const after = host.querySelector<HTMLInputElement>('.nc-input')!
    expect(after).not.toBe(input)
    expect(document.activeElement).toBe(after)
    expect(after.value).toBe('abc')
  })

  it('navigates between pages with page links', async () => {
    const project = template('landing')
    const a = start(project)
    expect(a.pageId).toBe(project.homePageId)
    const about = project.pages.find((p) => p.path === 'about')!
    const link = [...host.querySelectorAll<HTMLAnchorElement>('a.nc-link')].find((l) => l.textContent === 'About')!
    expect(link.getAttribute('href')).toBe('#/about')
    link.click()
    expect(a.pageId).toBe(about.id)
    expect(host.textContent).toContain('About us')
  })

  it('uses the URL hash as router in exported sites', async () => {
    const project = template('landing')
    window.location.hash = '#/contact'
    const a = start(project, 'hash')
    expect(a.pageId).toBe(project.pages.find((p) => p.path === 'contact')!.id)
    expect(document.title).toBe('Contact')
    a.navigate(project.homePageId)
    await flush()
    expect(window.location.hash).toBe('#/')
    expect(a.pageId).toBe(project.homePageId)
    window.location.hash = ''
  })

  it('loads data with the fetch action when a page loads', async () => {
    const users = [{ name: 'Ada Lovelace', email: 'ada@example.com', company: { name: 'Engines' } }]
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(users), { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const a = start(template('directory'))
    await flush()
    await flush()
    expect(fetchMock).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users', { method: 'GET' })
    expect(a.state.users).toEqual(users)
    expect(host.textContent).toContain('Ada Lovelace')
    expect(host.textContent).not.toContain('Loading…')

    host.querySelector<HTMLElement>('.nc-card')!.click()
    await flush()
    expect(host.textContent).toContain('@ · Engines')
    vi.unstubAllGlobals()
  })

  it('stores fetch errors in the error variable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    const a = start(template('directory'))
    await flush()
    await flush()
    expect(String(a.state.error)).toMatch(/Request failed \(500\)/)
    expect(host.textContent).toContain('⚠️ Request failed')
    vi.unstubAllGlobals()
  })
})

describe('JSON templates', () => {
  it('interpolates inside JSON without breaking on quotes', () => {
    expect(resolveJsonTemplate('{"title": "{{t}}", "n": "{{n}}"}', { t: 'say "hi"', n: 2 })).toEqual({ title: 'say "hi"', n: 2 })
    expect(resolveJsonTemplate('plain {{t}}', { t: 'x' })).toBe('plain x')
    expect(resolveJsonTemplate('{{list}}', { list: [1] })).toEqual([1])
  })
})

describe('design rendering', () => {
  it('marks nodes for selection and shows empty containers', () => {
    const project = template('blank')
    const page = project.pages[0]
    const root = renderDesignPage(document, project, page)
    expect(root.classList.contains('nc-design')).toBe(true)
    expect(root.querySelector(`[data-node-id="${page.root.id}"]`)).not.toBeNull()
    expect(root.querySelector('.nc-empty')).not.toBeNull()
  })

  it('renders every template without errors', () => {
    for (const t of TEMPLATES) {
      const project = t.create(t.name)
      for (const page of project.pages) {
        const root = renderDesignPage(document, project, page)
        expect(root.querySelectorAll('[data-node-id]').length).toBeGreaterThan(0)
      }
    }
  })
})
