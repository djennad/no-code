// Starter projects shown when creating a new project.

import { DEFAULT_THEME } from '../runtime/theme'
import type { Action, NodeData, Page, Project, Theme, Variable } from '../runtime/types'
import { contactForm, cta, faq, features, footer, hero, img, navbar, pricing, stats, testimonial } from './blocks'
import { uid } from './id'
import { createNode as c } from './registry'

export interface Template {
  id: string
  name: string
  description: string
  create: (name: string) => Project
}

function action<T extends Action['type']>(type: T, fields: Omit<Extract<Action, { type: T }>, 'id' | 'type'>): Action {
  return { id: uid('a'), type, ...fields } as unknown as Action
}

function variable(name: string, type: Variable['type'], initial: string): Variable {
  return { id: uid('v'), name, type, initial }
}

export function createPage(name: string, path: string, children: NodeData[] = [], extra: Partial<NodeData> = {}): Page {
  return { id: uid('p'), name, path, title: name, root: c('page', {}, {}, children, extra) }
}

function project(name: string, pages: Page[], variables: Variable[] = [], theme: Partial<Theme> = {}): Project {
  const now = Date.now()
  return {
    id: uid('prj'),
    name,
    version: 1,
    homePageId: pages[0].id,
    pages,
    variables,
    theme: { ...DEFAULT_THEME, ...theme },
    createdAt: now,
    updatedAt: now,
  }
}

const pageLink = (text: string, page: Page, style = {}) => c('link', { text, linkTo: 'page', pageId: page.id }, { color: 'inherit', ...style })

function blank(name: string): Project {
  return project(name, [createPage('Home', '')])
}

function landing(name: string): Project {
  const home = createPage('Home', '')
  const about = createPage('About', 'about')
  const contact = createPage('Contact', 'contact')
  const nav = () => navbar(name, [pageLink('Home', home), pageLink('About', about), pageLink('Contact', contact)])
  const foot = () =>
    footer(name, [pageLink('About', about, { color: '#d1d5db', fontSize: '14px' }), pageLink('Contact', contact, { color: '#d1d5db', fontSize: '14px' })])

  home.root.children = [nav(), hero(), features(), stats(), pricing(), testimonial(), faq(), cta(), foot()]
  home.title = `${name} — Build without code`

  about.root.children = [
    nav(),
    c('section', {}, { padding: '80px 24px' }, [
      c('row', {}, { alignItems: 'center', gap: '48px' }, [
        c('container', {}, { gap: '16px' }, [
          c('heading', { text: 'About us', level: '1' }),
          c('text', {
            text: 'We believe everyone should be able to bring their ideas to life. Our small, remote team builds tools that make creating on the web simple and fun.',
          }, { fontSize: '18px', color: '#4b5563' }),
          c('list', { items: 'Founded in 2024\nTeam of 12 across 6 countries\nUsed by 10,000+ makers' }),
        ]),
        c('image', { src: img('nocode-team', 1200, 900), alt: 'Our team' }, { borderRadius: '16px', height: '360px' }),
      ]),
    ]),
    foot(),
  ]
  const form = contactForm()
  form.style.padding = '80px 24px'
  contact.root.children = [nav(), form, foot()]
  return project(name, [home, about, contact], [
    variable('contactName', 'string', ''),
    variable('contactEmail', 'string', ''),
    variable('contactMessage', 'string', ''),
  ])
}

function todo(name: string): Project {
  const add = (): Action[] => [
    action('appendToList', { variable: 'todos', value: '{"title": "{{newTodo}}", "done": false}', condition: "newTodo != ''" }),
    action('setVariable', { variable: 'newTodo', value: '' }),
  ]
  const home = createPage('Tasks', '', [
    c('section', {}, { padding: '64px 16px', minHeight: '100%' }, [
      c('card', {}, { maxWidth: '560px', margin: '0 auto', width: '100%', padding: '32px', gap: '20px', shadow: 'md' }, [
        c('container', {}, { gap: '4px' }, [
          c('heading', { text: '✅ My tasks', level: '2' }),
          c('text', { text: '{{todos.length}} tasks in your list' }, { color: '#6b7280' }),
        ]),
        c('container', {}, { direction: 'row', gap: '8px', alignItems: 'flex-end' }, [
          c('input', { label: '', placeholder: 'What needs to be done?', bind: 'newTodo' }, { flex: '1' }, undefined, { events: { enter: add() } }),
          c('button', { text: 'Add' }, {}, undefined, { events: { click: add() } }),
        ]),
        c('repeater', { source: 'todos', as: 'item', emptyText: 'All done! Add a task above.' }, { gap: '8px' }, [
          c('container', {}, {
            direction: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            padding: '10px 12px', borderWidth: '1px', borderColor: '#e5e7eb', borderRadius: '8px',
            background: "{{item.done ? '#f9fafb' : '#ffffff'}}",
            opacity: "{{item.done ? '0.6' : '1'}}",
          }, [
            c('checkbox', { label: '{{item.title}}', bind: 'todos.{{index}}.done' }),
            c('button', { text: '✕', variant: 'ghost' }, { padding: '4px 10px' }, undefined, {
              events: { click: [action('removeFromList', { variable: 'todos', index: '{{index}}' })] },
            }),
          ]),
        ]),
      ]),
    ]),
  ], { style: { background: '#f3f4f6' } })
  return project(name, [home], [
    variable('newTodo', 'string', ''),
    variable(
      'todos',
      'json',
      JSON.stringify(
        [
          { title: 'Explore the editor', done: true },
          { title: 'Drag a component onto the page', done: false },
          { title: 'Publish my first app', done: false },
        ],
        null,
        2,
      ),
    ),
  ], { primary: '#16a34a' })
}

function directory(name: string): Project {
  const profile = createPage('Profile', 'profile')
  const home = createPage('People', '', [], {
    events: {
      load: [
        action('fetch', {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/users',
          body: '',
          resultVariable: 'users',
          errorVariable: 'error',
          condition: 'users.length == 0',
        }),
      ],
    },
  })
  home.root.children = [
    c('section', {}, { padding: '56px 24px' }, [
      c('heading', { text: 'Team directory', level: '1' }),
      c('text', { text: 'Loaded live from a public API when the page opens. Click a person to see their profile.' }, { color: '#6b7280' }),
      c('text', { text: '⚠️ {{error}}' }, { color: '#b91c1c' }, undefined, { visibleIf: "error != ''" }),
      c('text', { text: 'Loading…' }, { color: '#6b7280' }, undefined, { visibleIf: "users.length == 0 && error == ''" }),
      c('repeater', { source: 'users', as: 'person', emptyText: '' }, { direction: 'row', wrap: true, gap: '16px' }, [
        c('card', {}, { gap: '6px', width: '320px' }, [
          c('image', { src: 'https://i.pravatar.cc/150?u={{person.email}}', alt: '{{person.name}}' }, { width: '56px', height: '56px', borderRadius: '999px' }),
          c('heading', { text: '{{person.name}}', level: '4' }),
          c('text', { text: '{{person.company.name}}' }, { color: '#6b7280' }),
          c('text', { text: '✉️ {{person.email}}' }, { fontSize: '14px' }),
        ], {
          events: {
            click: [
              action('setVariable', { variable: 'selected', value: '{{person}}' }),
              action('navigate', { pageId: profile.id }),
            ],
          },
        }),
      ]),
    ]),
  ]
  profile.root.children = [
    c('section', {}, { padding: '56px 24px' }, [
      c('link', { text: '← Back to everyone', linkTo: 'page', pageId: home.id }),
      c('card', {}, { maxWidth: '560px', gap: '10px', padding: '32px', shadow: 'md' }, [
        c('image', { src: 'https://i.pravatar.cc/150?u={{selected.email}}', alt: '{{selected.name}}' }, { width: '88px', height: '88px', borderRadius: '999px' }),
        c('heading', { text: '{{selected.name}}', level: '2' }),
        c('text', { text: '@{{selected.username}} · {{selected.company.name}}' }, { color: '#6b7280' }),
        c('divider'),
        c('text', { text: '✉️ {{selected.email}}\n📞 {{selected.phone}}\n📍 {{selected.address.street}}, {{selected.address.city}}' }),
        c('link', { text: 'Visit website', href: 'https://{{selected.website}}', newTab: true }),
      ]),
    ]),
  ]
  return project(name, [home, profile], [
    variable('users', 'json', '[]'),
    variable('selected', 'json', '{"name": "Select someone first"}'),
    variable('error', 'string', ''),
  ], { primary: '#0ea5e9', background: '#f8fafc' })
}

function portfolio(name: string): Project {
  const home = createPage('Home', '', [
    c('section', {}, { padding: '96px 24px 48px' }, [
      c('container', {}, { gap: '20px', maxWidth: '760px' }, [
        c('text', { text: '👋 Hi, I’m Alex' }, { fontSize: '18px', fontWeight: '600', color: 'var(--nc-primary)' }),
        c('heading', { text: 'I design calm, useful products for the web.', level: '1' }),
        c('text', { text: 'Product designer based in Lisbon. Currently helping startups turn complex ideas into simple interfaces.' }, { fontSize: '20px', color: '#57534e' }),
        c('container', {}, { direction: 'row', gap: '12px', wrap: true }, [
          c('button', { text: 'Say hello' }, {}, undefined, { events: { click: [action('openUrl', { url: 'mailto:hello@example.com', newTab: false })] } }),
          c('button', { text: 'View work', variant: 'outline' }),
        ]),
      ]),
    ]),
    c('section', {}, { padding: '24px 24px 96px' }, [
      c('heading', { text: 'Selected work', level: '3' }),
      c('row', {}, { gap: '24px' }, ['Banking app', 'Travel planner', 'Design system'].map((title, i) =>
        c('container', {}, { gap: '10px' }, [
          c('image', { src: img(`nocode-work-${i}`, 900, 700), alt: title }, { height: '240px', borderRadius: '12px' }),
          c('heading', { text: title, level: '5' }),
          c('text', { text: 'Case study · 2026' }, { color: '#78716c', fontSize: '14px' }),
        ]),
      )),
    ]),
    c('section', {}, { padding: '32px 24px', background: '#1c1917', color: '#d6d3d1' }, [
      c('text', { text: '© Alex Morgan · hello@example.com' }, { textAlign: 'center', fontSize: '14px' }),
    ]),
  ])
  return project(name, [home], [], { primary: '#ea580c', background: '#fafaf9', text: '#1c1917', font: 'dmsans' })
}

export const TEMPLATES: Template[] = [
  { id: 'blank', name: 'Blank', description: 'Start from an empty page', create: blank },
  { id: 'landing', name: 'Business website', description: '3 pages: home, about and a working contact form', create: landing },
  { id: 'portfolio', name: 'Portfolio', description: 'Personal page with your work', create: portfolio },
  { id: 'todo', name: 'Task app', description: 'Interactive to-do list using variables and a repeater', create: todo },
  { id: 'directory', name: 'API directory', description: 'Loads people from a web API, with a profile page', create: directory },
]
