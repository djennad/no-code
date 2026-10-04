// Turns the node tree into DOM. The same renderer powers the editor canvas
// ("design" mode), the in-editor preview and exported sites ("live" mode).

import { evaluate, interpolate, isTruthy, stringify, type Scope } from './expression'
import { getIn, splitPath, type State } from './state'
import type { Action, ComponentType, NodeData, Project, StyleProps } from './types'

export type RenderMode = 'design' | 'live'

export interface PendingInput {
  key: string
  raw: string
  value: unknown
}

export interface RenderContext {
  doc: Document
  project: Project
  mode: RenderMode
  state: State
  /** Repeater variables such as `item` and `index`. */
  locals: Scope
  /** state + locals, used to evaluate expressions. */
  scope: Scope
  /** Makes element keys unique inside repeaters (used to restore focus). */
  keyPrefix: string
  /** Design mode: rendering an extra repeater copy that cannot be selected. */
  ghost?: boolean
  /** Open external links in a new tab (used by the in-editor preview). */
  forceNewTab?: boolean
  pendingInput?: PendingInput | null
  stable?: Map<string, HTMLElement>
  runActions?: (actions: Action[], locals: Scope) => void
  setValue?: (path: string, value: unknown, inputKey?: string, raw?: string) => void
  navigate?: (pageId: string) => void
  pageHref?: (pageId: string) => string
}

interface Rendered {
  el: HTMLElement
  /** Element that holds child nodes (drop target in the editor). */
  host?: HTMLElement
  /** Element that receives layout styles; defaults to host, then el. */
  layout?: HTMLElement
  /** The renderer already rendered the children itself. */
  ownChildren?: boolean
}

type Renderer = (node: NodeData, ctx: RenderContext) => Rendered

const CONTAINER_TYPES = new Set<ComponentType>(['page', 'section', 'container', 'row', 'card', 'repeater'])

export function isContainerType(type: ComponentType): boolean {
  return CONTAINER_TYPES.has(type)
}

export function createContext(base: Omit<RenderContext, 'scope' | 'locals' | 'keyPrefix'> & Partial<RenderContext>): RenderContext {
  const locals = base.locals ?? {}
  return { ...base, locals, keyPrefix: base.keyPrefix ?? '', scope: { ...base.state, ...locals } }
}

export function renderNode(node: NodeData, ctx: RenderContext): HTMLElement | null {
  const visible = isTruthy(node.visibleIf, ctx.scope)
  if (!visible && ctx.mode === 'live') return null
  const renderer = RENDERERS[node.type]
  if (!renderer) return null
  const { el, host, layout, ownChildren } = renderer(node, ctx)

  applyStyle(node, el, layout ?? host ?? el, ctx)
  if (node.anchor?.trim() && !ctx.ghost) el.id = node.anchor.trim()
  if (node.hideOn === 'mobile') el.classList.add('nc-hide-mobile')
  if (node.hideOn === 'desktop') el.classList.add('nc-hide-desktop')

  if (ctx.mode === 'design') {
    if (!ctx.ghost) {
      el.dataset.nodeId = node.id
      if (node.type !== 'page') el.draggable = true
      if (host) host.dataset.childrenHost = node.id
    }
    if (node.visibleIf?.trim()) el.classList.add('nc-conditional')
    if (!visible) el.classList.add('nc-design-hidden')
  }

  if (host && !ownChildren) renderChildren(node, host, ctx)

  const clickActions = node.events?.click
  if (ctx.mode === 'live' && clickActions?.length && node.type !== 'link') {
    el.classList.add('nc-clickable')
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      ctx.runActions?.(clickActions, ctx.locals)
    })
  }
  return el
}

function renderChildren(node: NodeData, host: HTMLElement, ctx: RenderContext) {
  const children = node.children ?? []
  for (const child of children) {
    const el = renderNode(child, ctx)
    if (el) host.appendChild(el)
  }
  if (ctx.mode === 'design' && !ctx.ghost && children.length === 0) {
    const empty = ctx.doc.createElement('div')
    empty.className = 'nc-empty'
    empty.textContent = node.type === 'page' ? 'Drag components or blocks here from the left panel' : 'Drop components here'
    host.appendChild(empty)
  }
}

// ---------------------------------------------------------------------------
// Styles

const LENGTH_KEYS = new Set([
  'gap',
  'padding',
  'margin',
  'width',
  'maxWidth',
  'height',
  'minHeight',
  'fontSize',
  'letterSpacing',
  'borderWidth',
  'borderRadius',
])
const LAYOUT_KEYS = new Set(['gap', 'alignItems', 'justifyContent'])

/** Adds `px` to unit-less numbers, so "16" and "8 16" become valid lengths. */
export function cssLength(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => (/^-?\d*\.?\d+$/.test(part) && Number(part) !== 0 ? `${part}px` : part))
    .join(' ')
}

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
}

function applyStyle(node: NodeData, el: HTMLElement, layout: HTMLElement, ctx: RenderContext) {
  const style = node.style as Record<string, unknown>
  for (const key of Object.keys(style) as (keyof StyleProps)[]) {
    const raw = style[key]
    if (raw === undefined || raw === null || raw === '' || raw === false) continue
    if (key === 'wrap') {
      layout.style.flexWrap = 'wrap'
      continue
    }
    if (key === 'shadow') {
      el.classList.add(`nc-shadow-${String(raw)}`)
      continue
    }
    if (key === 'background' || key === 'backgroundImage') continue
    let value = interpolate(raw, ctx.scope).trim()
    if (!value) continue
    if (LENGTH_KEYS.has(key)) value = cssLength(value)
    if (key === 'direction') {
      if (node.type !== 'row') layout.style.flexDirection = value
    } else if (LAYOUT_KEYS.has(key)) {
      layout.style.setProperty(kebab(key), value)
    } else if (key === 'borderWidth') {
      el.style.borderWidth = value
      el.style.borderStyle = 'solid'
    } else {
      el.style.setProperty(kebab(key), value)
    }
  }
  const background = interpolate(style.background ?? '', ctx.scope).trim()
  if (background) el.style.background = background
  const image = interpolate(style.backgroundImage ?? '', ctx.scope).trim()
  if (image) {
    el.style.backgroundImage = `url("${image.replace(/["\\\n]/g, '')}")`
    el.style.backgroundSize = 'cover'
    el.style.backgroundPosition = 'center'
  }
}

// ---------------------------------------------------------------------------
// Helpers

function make<K extends keyof HTMLElementTagNameMap>(ctx: RenderContext, tag: K, className?: string): HTMLElementTagNameMap[K] {
  const el = ctx.doc.createElement(tag)
  if (className) el.className = className
  return el
}

function prop(node: NodeData, key: string): string {
  const v = node.props[key]
  return typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v)
}

/** Interpolates text. In the editor, unresolved templates are shown as written. */
function text(ctx: RenderContext, value: string): string {
  const out = interpolate(value, ctx.scope)
  if (ctx.mode === 'design' && !out.trim() && value.includes('{{')) return value
  return out
}

export function safeUrl(url: string): string {
  const trimmed = url.trim()
  return /^(javascript|vbscript|data:text\/html)/i.test(trimmed.replace(/\s/g, '')) ? '#' : trimmed
}

export function videoSource(url: string): { kind: 'iframe' | 'video'; src: string } | null {
  const u = url.trim()
  if (!u) return null
  const yt = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(u)
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` }
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u)
  if (vimeo) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` }
  return { kind: 'video', src: safeUrl(u) }
}

export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#e5e7eb"/><g fill="#9ca3af"><circle cx="300" cy="190" r="40"/><path d="M180 380l140-150 90 95 70-60 140 115z"/></g></svg>',
  )

function bound(node: NodeData, ctx: RenderContext): { path: string; value: unknown } | null {
  const bind = prop(node, 'bind').trim()
  if (!bind) return null
  const path = interpolate(bind, ctx.scope).trim()
  if (!path) return null
  return { path, value: getIn(ctx.scope, splitPath(path)) }
}

function field(node: NodeData, ctx: RenderContext, control: HTMLElement): Rendered {
  const el = make(ctx, 'div', 'nc-field')
  const label = text(ctx, prop(node, 'label'))
  if (label) {
    const labelEl = make(ctx, 'label', 'nc-field-label')
    labelEl.textContent = label
    el.appendChild(labelEl)
  }
  el.appendChild(control)
  return { el }
}

/** Wires a text-like control to its bound variable and to the "enter" event. */
function wireTextControl(node: NodeData, ctx: RenderContext, control: HTMLInputElement | HTMLTextAreaElement, numeric: boolean) {
  const binding = bound(node, ctx)
  const key = ctx.keyPrefix + node.id
  control.dataset.key = key
  control.placeholder = text(ctx, prop(node, 'placeholder'))
  const pending = ctx.pendingInput
  const value = binding ? binding.value : prop(node, 'defaultValue')
  control.value = pending && pending.key === key && pending.value === value ? pending.raw : stringify(value)
  if (ctx.mode === 'design') {
    control.readOnly = true
    control.tabIndex = -1
    return
  }
  if (binding) {
    control.addEventListener('input', () => {
      const raw = control.value
      const next = numeric ? (raw.trim() === '' ? '' : Number(raw)) : raw
      ctx.setValue?.(binding.path, next, key, raw)
    })
  }
  const enter = node.events?.enter
  if (enter?.length && control.tagName === 'INPUT') {
    control.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).isComposing) {
        e.preventDefault()
        ctx.runActions?.(enter, ctx.locals)
      }
    })
  }
}

// ---------------------------------------------------------------------------
// Components

const RENDERERS: Record<ComponentType, Renderer> = {
  page(_node, ctx) {
    const el = make(ctx, 'div', 'nc-page')
    return { el, host: el }
  },

  section(node, ctx) {
    const el = make(ctx, 'section', 'nc-section')
    const inner = make(ctx, 'div', 'nc-section-inner')
    const width = prop(node, 'contentWidth').trim()
    if (width) inner.style.maxWidth = cssLength(width)
    el.appendChild(inner)
    return { el, host: inner }
  },

  container(_node, ctx) {
    const el = make(ctx, 'div', 'nc-container')
    return { el, host: el }
  },

  row(node, ctx) {
    const el = make(ctx, 'div', 'nc-row')
    if (node.props.stackOnMobile !== false) el.classList.add('nc-stack')
    return { el, host: el }
  },

  card(_node, ctx) {
    const el = make(ctx, 'div', 'nc-card')
    return { el, host: el }
  },

  repeater(node, ctx) {
    const el = make(ctx, 'div', 'nc-repeater')
    const source = prop(node, 'source').trim()
    const value = source ? evaluate(source, ctx.scope) : undefined
    const items = Array.isArray(value) ? value : []
    const alias = prop(node, 'as').trim() || 'item'

    const renderItem = (item: unknown, index: number, ghost: boolean) => {
      const wrap = make(ctx, 'div', 'nc-repeater-item')
      const locals = { ...ctx.locals, [alias]: item, index }
      renderChildren(node, wrap, {
        ...ctx,
        ghost: ctx.ghost || ghost,
        locals,
        scope: { ...ctx.state, ...locals },
        keyPrefix: `${ctx.keyPrefix}${node.id}.${index}/`,
      })
      el.appendChild(wrap)
      return wrap
    }

    if (ctx.mode === 'design') {
      const host = renderItem(items.length ? items[0] : {}, 0, false)
      for (let i = 1; i < Math.min(items.length, 4); i++) renderItem(items[i], i, true).classList.add('nc-ghost')
      return { el, host, layout: el, ownChildren: true }
    }

    if (items.length === 0) {
      const empty = prop(node, 'emptyText')
      if (empty) {
        const p = make(ctx, 'p', 'nc-text nc-repeater-empty')
        p.textContent = interpolate(empty, ctx.scope)
        el.appendChild(p)
      }
    }
    items.forEach((item, index) => renderItem(item, index, false))
    return { el }
  },

  heading(node, ctx) {
    const level = Math.min(6, Math.max(1, Number(node.props.level) || 2))
    const el = make(ctx, `h${level}` as 'h2', 'nc-heading')
    el.textContent = text(ctx, prop(node, 'text'))
    return { el }
  },

  text(node, ctx) {
    const el = make(ctx, 'p', 'nc-text')
    el.textContent = text(ctx, prop(node, 'text'))
    return { el }
  },

  button(node, ctx) {
    const el = make(ctx, 'button', `nc-button nc-button--${prop(node, 'variant') || 'primary'}`)
    el.type = 'button'
    el.textContent = text(ctx, prop(node, 'text'))
    return { el }
  },

  link(node, ctx) {
    const el = make(ctx, 'a', 'nc-link')
    el.textContent = text(ctx, prop(node, 'text'))
    const clickActions = node.events?.click
    if (node.props.linkTo === 'page') {
      const pageId = prop(node, 'pageId')
      el.href = ctx.pageHref?.(pageId) ?? '#'
      if (ctx.mode === 'live') {
        el.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          if (clickActions?.length) ctx.runActions?.(clickActions, ctx.locals)
          if (pageId) ctx.navigate?.(pageId)
        })
      }
    } else {
      const href = safeUrl(interpolate(prop(node, 'href'), ctx.scope)) || '#'
      el.href = href
      const inPage = href.startsWith('#') && !href.startsWith('#/')
      if (!inPage && (node.props.newTab || ctx.forceNewTab)) {
        el.target = '_blank'
        el.rel = 'noopener noreferrer'
      }
      if (ctx.mode === 'live') {
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          if (clickActions?.length) ctx.runActions?.(clickActions, ctx.locals)
          // In-page anchors scroll instead of changing the URL, which the router owns.
          if (inPage) {
            e.preventDefault()
            const id = decodeURIComponent(href.slice(1))
            if (id) ctx.doc.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        })
      }
    }
    return { el }
  },

  image(node, ctx) {
    const el = make(ctx, 'img', 'nc-image')
    el.src = safeUrl(interpolate(prop(node, 'src'), ctx.scope)) || PLACEHOLDER_IMAGE
    el.alt = interpolate(prop(node, 'alt'), ctx.scope)
    el.draggable = false
    const fit = prop(node, 'fit')
    if (fit) el.style.objectFit = fit
    return { el }
  },

  video(node, ctx) {
    const el = make(ctx, 'div', 'nc-video')
    const source = videoSource(interpolate(prop(node, 'url'), ctx.scope))
    if (!source) return { el }
    const key = `${ctx.keyPrefix}${node.id}|${source.src}`
    let media = ctx.mode === 'live' ? ctx.stable?.get(key) : undefined
    if (!media) {
      if (source.kind === 'iframe') {
        const iframe = make(ctx, 'iframe')
        iframe.src = source.src
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'
        iframe.allowFullscreen = true
        iframe.title = 'Embedded video'
        media = iframe
      } else {
        const video = make(ctx, 'video')
        video.src = source.src
        video.controls = true
        media = video
      }
      if (ctx.mode === 'live') ctx.stable?.set(key, media)
    }
    el.appendChild(media)
    return { el }
  },

  list(node, ctx) {
    const el = make(ctx, node.props.ordered ? 'ol' : 'ul', 'nc-list')
    for (const line of prop(node, 'items').split('\n')) {
      if (!line.trim()) continue
      const li = make(ctx, 'li')
      li.textContent = text(ctx, line)
      el.appendChild(li)
    }
    return { el }
  },

  divider(_node, ctx) {
    return { el: make(ctx, 'hr', 'nc-divider') }
  },

  spacer(node, ctx) {
    const el = make(ctx, 'div', 'nc-spacer')
    el.style.height = cssLength(prop(node, 'size') || '32')
    return { el }
  },

  input(node, ctx) {
    const input = make(ctx, 'input', 'nc-input')
    const type = prop(node, 'inputType') || 'text'
    input.type = type
    wireTextControl(node, ctx, input, type === 'number')
    return field(node, ctx, input)
  },

  textarea(node, ctx) {
    const area = make(ctx, 'textarea', 'nc-textarea')
    area.rows = Number(node.props.rows) || 4
    wireTextControl(node, ctx, area, false)
    return field(node, ctx, area)
  },

  checkbox(node, ctx) {
    const el = make(ctx, 'label', 'nc-checkbox')
    const input = make(ctx, 'input')
    input.type = 'checkbox'
    const binding = bound(node, ctx)
    input.checked = !!binding?.value
    input.dataset.key = ctx.keyPrefix + node.id
    const span = make(ctx, 'span')
    span.textContent = text(ctx, prop(node, 'label'))
    el.append(input, span)
    if (ctx.mode === 'design') {
      input.tabIndex = -1
    } else if (binding) {
      input.addEventListener('change', () => ctx.setValue?.(binding.path, input.checked))
    }
    return { el }
  },

  select(node, ctx) {
    const select = make(ctx, 'select', 'nc-select')
    select.dataset.key = ctx.keyPrefix + node.id
    const placeholder = text(ctx, prop(node, 'placeholder'))
    if (placeholder) {
      const opt = make(ctx, 'option')
      opt.value = ''
      opt.textContent = placeholder
      select.appendChild(opt)
    }
    for (const line of prop(node, 'options').split('\n')) {
      if (!line.trim()) continue
      const [value, label] = line.includes('|') ? line.split('|', 2) : [line, line]
      const opt = make(ctx, 'option')
      opt.value = value.trim()
      opt.textContent = text(ctx, label.trim())
      select.appendChild(opt)
    }
    const binding = bound(node, ctx)
    if (binding) select.value = stringify(binding.value)
    if (ctx.mode === 'design') {
      select.tabIndex = -1
    } else if (binding) {
      select.addEventListener('change', () => ctx.setValue?.(binding.path, select.value))
    }
    return field(node, ctx, select)
  },
}
