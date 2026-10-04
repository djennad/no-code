// The live runtime: owns app state, runs actions and switches pages.

import { interpolate, isTruthy, resolveValue, stringify, type Scope } from './expression'
import { createContext, renderNode, safeUrl, type PendingInput } from './render'
import { coerce, findVariable, getIn, initialState, setIn, splitPath, type State } from './state'
import { applyTheme, injectRuntimeStyles } from './theme'
import type { Action, Page, Project } from './types'

export interface MountOptions {
  /** "hash" keeps the page in the URL (#/about); "memory" is used by the editor preview. */
  router?: 'hash' | 'memory'
  /** Initial page for the memory router. */
  pageId?: string
  onNavigate?: (pageId: string) => void
  onStateChange?: (state: State) => void
}

export interface AppHandle {
  readonly state: State
  readonly pageId: string
  navigate(pageId: string): void
  setValue(path: string, value: unknown): void
  runActions(actions: Action[], locals?: Scope): Promise<void>
  destroy(): void
}

/**
 * Parses a template that may be JSON (e.g. {"title": "{{name}}"}). JSON templates
 * are parsed first and their string values interpolated, so user input that
 * contains quotes can never break the structure.
 */
export function resolveJsonTemplate(template: string, scope: Scope): unknown {
  const trimmed = template.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return mapStrings(JSON.parse(trimmed), (s) => resolveValue(s, scope))
    } catch {
      // Not JSON: fall through to a plain template.
    }
  }
  return resolveValue(template, scope)
}

function mapStrings(value: unknown, fn: (s: string) => unknown): unknown {
  if (typeof value === 'string') return fn(value)
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)]))
  }
  return value
}

export function pageFromHash(project: Project, hash: string): Page {
  const path = decodeURIComponent(hash.replace(/^#\/?/, '')).replace(/\/$/, '')
  return project.pages.find((p) => p.path === path && path !== '') ?? homePage(project)
}

export function homePage(project: Project): Page {
  return project.pages.find((p) => p.id === project.homePageId) ?? project.pages[0]
}

export class App implements AppHandle {
  state: State
  pageId: string
  private root: HTMLElement
  private renderQueued = false
  private destroyed = false
  private pendingInput: PendingInput | null = null
  private stable = new Map<string, HTMLElement>()
  private project: Project
  private options: MountOptions
  private onHashChange = () => {
    const hash = this.win.location.hash
    // Plain anchors (#pricing) scroll within the page; only #/path is a route.
    if (hash && !hash.startsWith('#/')) return
    this.show(pageFromHash(this.project, hash).id)
  }

  constructor(container: HTMLElement, project: Project, options: MountOptions = {}) {
    this.project = project
    this.options = options
    const doc = container.ownerDocument
    injectRuntimeStyles(doc)
    this.root = doc.createElement('div')
    this.root.className = 'nc-app'
    applyTheme(this.root, project.theme)
    container.appendChild(this.root)
    this.state = initialState(project)

    if (this.router === 'hash') {
      this.win.addEventListener('hashchange', this.onHashChange)
      this.pageId = pageFromHash(project, this.win.location.hash).id
    } else {
      this.pageId = project.pages.find((p) => p.id === options.pageId)?.id ?? homePage(project).id
    }
    this.show(this.pageId)
  }

  private get router() {
    return this.options.router ?? 'memory'
  }

  private get win(): Window {
    return this.root.ownerDocument.defaultView ?? window
  }

  private get page(): Page {
    return this.project.pages.find((p) => p.id === this.pageId) ?? homePage(this.project)
  }

  navigate(pageId: string) {
    const page = this.project.pages.find((p) => p.id === pageId)
    if (!page) return
    if (this.router === 'hash') {
      const hash = `#/${page.path}`
      if (this.win.location.hash === hash || (!page.path && !this.win.location.hash)) this.show(page.id)
      else this.win.location.hash = hash
    } else {
      this.show(page.id)
    }
  }

  private show(pageId: string) {
    this.pageId = pageId
    const page = this.page
    if (this.router === 'hash') {
      this.root.ownerDocument.title = page.title || page.name || this.project.name
      this.win.scrollTo?.(0, 0)
    }
    this.options.onNavigate?.(page.id)
    this.render()
    const load = page.root.events?.load
    if (load?.length) void this.runActions(load)
  }

  setValue(path: string, value: unknown, inputKey?: string, raw?: string) {
    const keys = splitPath(path)
    if (keys.length === 0) return
    const variable = keys.length === 1 ? findVariable(this.project, keys[0]) : undefined
    const next = variable ? coerce(value, variable.type) : value
    this.state = setIn(this.state, keys, next) as State
    this.pendingInput = inputKey !== undefined && raw !== undefined ? { key: inputKey, raw, value: next } : null
    this.options.onStateChange?.(this.state)
    this.scheduleRender()
  }

  private scheduleRender() {
    if (this.renderQueued) return
    this.renderQueued = true
    queueMicrotask(() => {
      this.renderQueued = false
      if (!this.destroyed) this.render()
    })
  }

  private render() {
    const doc = this.root.ownerDocument
    // Re-rendering replaces the DOM, so remember which control had focus.
    const active = doc.activeElement as HTMLInputElement | null
    const focusKey = active && this.root.contains(active) ? active.dataset?.key : undefined
    let selection: [number | null, number | null] | null = null
    try {
      selection = focusKey ? [active!.selectionStart, active!.selectionEnd] : null
    } catch {
      selection = null
    }

    const ctx = createContext({
      doc,
      project: this.project,
      mode: 'live',
      state: this.state,
      pendingInput: this.pendingInput,
      stable: this.stable,
      forceNewTab: this.router === 'memory',
      runActions: (actions, locals) => void this.runActions(actions, locals),
      setValue: (path, value, key, raw) => this.setValue(path, value, key, raw),
      navigate: (id) => this.navigate(id),
      pageHref: (id) => `#/${this.project.pages.find((p) => p.id === id)?.path ?? ''}`,
    })
    const el = renderNode(this.page.root, ctx)
    this.root.replaceChildren(...(el ? [el] : []))

    if (focusKey) {
      const target = this.root.querySelector<HTMLInputElement>(`[data-key="${CSS.escape(focusKey)}"]`)
      if (target) {
        target.focus({ preventScroll: true })
        try {
          if (selection && selection[0] !== null) target.setSelectionRange(selection[0], selection[1])
        } catch {
          // Some input types (number, checkbox) do not support selection ranges.
        }
      }
    }
  }

  async runActions(actions: Action[], locals: Scope = {}) {
    for (const action of actions) {
      if (this.destroyed) return
      const scope = { ...this.state, ...locals }
      if (!isTruthy(action.condition, scope)) continue
      try {
        await this.execute(action, scope)
      } catch (err) {
        console.error('[no-code] action failed', action, err)
      }
    }
  }

  private async execute(action: Action, scope: Scope) {
    switch (action.type) {
      case 'navigate':
        this.navigate(action.pageId)
        return
      case 'openUrl': {
        const url = safeUrl(interpolate(action.url, scope))
        if (!url || url === '#') return
        if (action.newTab || this.router === 'memory') this.win.open(url, '_blank', 'noopener')
        else this.win.location.href = url
        return
      }
      case 'setVariable':
        this.setValue(interpolate(action.variable, scope), resolveJsonTemplate(action.value, scope))
        return
      case 'increment': {
        const path = interpolate(action.variable, scope)
        const current = Number(getIn(this.state, splitPath(path))) || 0
        const raw = action.amount?.trim() ? Number(resolveValue(action.amount, scope)) : 1
        this.setValue(path, current + (Number.isFinite(raw) ? raw : 1))
        return
      }
      case 'toggle': {
        const path = interpolate(action.variable, scope)
        this.setValue(path, !getIn(this.state, splitPath(path)))
        return
      }
      case 'appendToList': {
        const path = interpolate(action.variable, scope)
        const current = getIn(this.state, splitPath(path))
        const list = Array.isArray(current) ? current : []
        this.setValue(path, [...list, resolveJsonTemplate(action.value, scope)])
        return
      }
      case 'removeFromList': {
        const path = interpolate(action.variable, scope)
        const current = getIn(this.state, splitPath(path))
        const index = Number(resolveValue(action.index, scope))
        if (!Array.isArray(current) || !Number.isInteger(index)) return
        this.setValue(
          path,
          current.filter((_, i) => i !== index),
        )
        return
      }
      case 'alert':
        this.win.alert(interpolate(action.message, scope))
        return
      case 'fetch': {
        const url = interpolate(action.url, scope).trim()
        if (!url) return
        const init: RequestInit = { method: action.method || 'GET' }
        if (init.method !== 'GET' && action.body?.trim()) {
          const body = resolveJsonTemplate(action.body, scope)
          init.body = typeof body === 'string' ? body : JSON.stringify(body)
          init.headers = { 'Content-Type': 'application/json' }
        }
        try {
          const res = await fetch(url, init)
          const type = res.headers.get('content-type') ?? ''
          const data = type.includes('json') ? await res.json() : await res.text()
          if (!res.ok) throw new Error(`Request failed (${res.status}) ${stringify(data).slice(0, 200)}`)
          if (action.resultVariable?.trim()) this.setValue(interpolate(action.resultVariable, scope), data)
          if (action.errorVariable?.trim()) this.setValue(interpolate(action.errorVariable, scope), '')
        } catch (err) {
          if (action.errorVariable?.trim()) this.setValue(interpolate(action.errorVariable, scope), (err as Error).message)
          else throw err
        }
        return
      }
    }
  }

  destroy() {
    this.destroyed = true
    this.win.removeEventListener('hashchange', this.onHashChange)
    this.stable.clear()
    this.root.remove()
  }
}

export function mount(container: HTMLElement, project: Project, options?: MountOptions): AppHandle {
  return new App(container, project, options)
}
