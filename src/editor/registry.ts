// Editor metadata for every component: palette entry, defaults and inspector fields.

import {
  AlignLeft,
  ChevronDown,
  Columns2,
  CreditCard,
  FileText,
  Heading,
  Image,
  Link,
  List,
  Minus,
  MousePointerClick,
  MoveVertical,
  PanelTop,
  Pilcrow,
  Repeat,
  Square,
  SquareCheck,
  TextCursorInput,
  Video,
  type LucideIcon,
} from 'lucide-react'
import type { ComponentType, EventName, NodeData, StyleProps } from '../runtime/types'
import { uid } from './id'

export type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'page' | 'variable' | 'expression'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  options?: { value: string; label: string }[]
  placeholder?: string
  help?: string
  showIf?: (props: Record<string, unknown>) => boolean
}

export type Category = 'Layout' | 'Content' | 'Forms' | 'Data'

export interface ComponentMeta {
  type: ComponentType
  label: string
  description: string
  category: Category
  icon: LucideIcon
  container: boolean
  defaultProps: Record<string, unknown>
  defaultStyle: StyleProps
  fields: FieldDef[]
  events: { name: EventName; label: string }[]
  /** Prop edited by double-clicking the element on the canvas. */
  textProp?: string
  defaultChildren?: () => NodeData[]
}

const CLICK = [{ name: 'click' as const, label: 'On click' }]

const BIND_FIELD: FieldDef = {
  key: 'bind',
  label: 'Save value to variable',
  kind: 'variable',
  placeholder: 'e.g. email',
  help: 'The variable is updated as the user types, and the field shows its current value.',
}

export const REGISTRY: Record<ComponentType, ComponentMeta> = {
  page: {
    type: 'page',
    label: 'Page',
    description: 'The page itself',
    category: 'Layout',
    icon: FileText,
    container: true,
    defaultProps: {},
    defaultStyle: {},
    fields: [],
    events: [{ name: 'load', label: 'When the page loads' }],
  },
  section: {
    type: 'section',
    label: 'Section',
    description: 'Full-width band with centered content',
    category: 'Layout',
    icon: PanelTop,
    container: true,
    defaultProps: { contentWidth: '' },
    defaultStyle: {},
    fields: [{ key: 'contentWidth', label: 'Content width', kind: 'text', placeholder: '1100px' }],
    events: CLICK,
  },
  container: {
    type: 'container',
    label: 'Box',
    description: 'Groups elements vertically or horizontally',
    category: 'Layout',
    icon: Square,
    container: true,
    defaultProps: {},
    defaultStyle: {},
    fields: [],
    events: CLICK,
  },
  row: {
    type: 'row',
    label: 'Columns',
    description: 'Side-by-side columns that stack on mobile',
    category: 'Layout',
    icon: Columns2,
    container: true,
    defaultProps: { stackOnMobile: true },
    defaultStyle: {},
    fields: [{ key: 'stackOnMobile', label: 'Stack columns on mobile', kind: 'checkbox' }],
    events: [],
    defaultChildren: () => [createNode('container'), createNode('container')],
  },
  card: {
    type: 'card',
    label: 'Card',
    description: 'Box with a background, border and shadow',
    category: 'Layout',
    icon: CreditCard,
    container: true,
    defaultProps: {},
    defaultStyle: {},
    fields: [],
    events: CLICK,
    defaultChildren: () => [
      createNode('heading', { text: 'Card title', level: '3' }),
      createNode('text', { text: 'A short description goes here.' }),
    ],
  },
  repeater: {
    type: 'repeater',
    label: 'Repeater',
    description: 'Repeats its content for every item in a list',
    category: 'Data',
    icon: Repeat,
    container: true,
    defaultProps: { source: '', as: 'item', emptyText: 'Nothing here yet.' },
    defaultStyle: {},
    fields: [
      {
        key: 'source',
        label: 'List to repeat',
        kind: 'expression',
        placeholder: 'e.g. todos',
        help: 'A variable holding a list. Inside, use {{item.field}} and {{index}}.',
      },
      { key: 'as', label: 'Item name', kind: 'text', placeholder: 'item' },
      { key: 'emptyText', label: 'Text when the list is empty', kind: 'text' },
    ],
    events: [],
    defaultChildren: () => [createNode('card', {}, {}, [createNode('text', { text: '{{item}}' })])],
  },
  heading: {
    type: 'heading',
    label: 'Heading',
    description: 'Title text (H1–H6)',
    category: 'Content',
    icon: Heading,
    container: false,
    defaultProps: { text: 'Heading', level: '2' },
    defaultStyle: {},
    fields: [
      { key: 'text', label: 'Text', kind: 'textarea' },
      {
        key: 'level',
        label: 'Level',
        kind: 'select',
        options: ['1', '2', '3', '4', '5', '6'].map((l) => ({ value: l, label: `H${l}` })),
      },
    ],
    events: CLICK,
    textProp: 'text',
  },
  text: {
    type: 'text',
    label: 'Text',
    description: 'Paragraph of text',
    category: 'Content',
    icon: Pilcrow,
    container: false,
    defaultProps: { text: 'Write something here. Double-click to edit text right on the canvas.' },
    defaultStyle: {},
    fields: [{ key: 'text', label: 'Text', kind: 'textarea', help: 'Use {{variable}} to show data.' }],
    events: CLICK,
    textProp: 'text',
  },
  button: {
    type: 'button',
    label: 'Button',
    description: 'Clickable button that runs actions',
    category: 'Content',
    icon: MousePointerClick,
    container: false,
    defaultProps: { text: 'Click me', variant: 'primary' },
    defaultStyle: {},
    fields: [
      { key: 'text', label: 'Label', kind: 'text' },
      {
        key: 'variant',
        label: 'Style',
        kind: 'select',
        options: [
          { value: 'primary', label: 'Primary' },
          { value: 'secondary', label: 'Secondary' },
          { value: 'outline', label: 'Outline' },
          { value: 'ghost', label: 'Ghost' },
        ],
      },
    ],
    events: CLICK,
    textProp: 'text',
  },
  link: {
    type: 'link',
    label: 'Link',
    description: 'Text link to a page or URL',
    category: 'Content',
    icon: Link,
    container: false,
    defaultProps: { text: 'Learn more', linkTo: 'url', href: 'https://example.com', newTab: false, pageId: '' },
    defaultStyle: {},
    fields: [
      { key: 'text', label: 'Text', kind: 'text' },
      {
        key: 'linkTo',
        label: 'Link to',
        kind: 'select',
        options: [
          { value: 'url', label: 'Web address' },
          { value: 'page', label: 'Page in this project' },
        ],
      },
      { key: 'href', label: 'URL', kind: 'text', placeholder: 'https://', showIf: (p) => p.linkTo !== 'page' },
      { key: 'newTab', label: 'Open in a new tab', kind: 'checkbox', showIf: (p) => p.linkTo !== 'page' },
      { key: 'pageId', label: 'Page', kind: 'page', showIf: (p) => p.linkTo === 'page' },
    ],
    events: CLICK,
    textProp: 'text',
  },
  image: {
    type: 'image',
    label: 'Image',
    description: 'Picture from a URL',
    category: 'Content',
    icon: Image,
    container: false,
    defaultProps: { src: '', alt: '', fit: 'cover' },
    defaultStyle: { width: '100%', borderRadius: '8px' },
    fields: [
      { key: 'src', label: 'Image URL', kind: 'text', placeholder: 'https://…' },
      { key: 'alt', label: 'Alt text', kind: 'text', help: 'Describes the image for screen readers.' },
      {
        key: 'fit',
        label: 'Fit',
        kind: 'select',
        options: [
          { value: 'cover', label: 'Cover (crop)' },
          { value: 'contain', label: 'Contain' },
          { value: 'fill', label: 'Stretch' },
        ],
      },
    ],
    events: CLICK,
  },
  video: {
    type: 'video',
    label: 'Video',
    description: 'YouTube, Vimeo or video file',
    category: 'Content',
    icon: Video,
    container: false,
    defaultProps: { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
    defaultStyle: {},
    fields: [{ key: 'url', label: 'Video URL', kind: 'text', help: 'YouTube, Vimeo or a link to an .mp4 file.' }],
    events: [],
  },
  list: {
    type: 'list',
    label: 'List',
    description: 'Bulleted or numbered list',
    category: 'Content',
    icon: List,
    container: false,
    defaultProps: { items: 'First item\nSecond item\nThird item', ordered: false },
    defaultStyle: {},
    fields: [
      { key: 'items', label: 'Items (one per line)', kind: 'textarea' },
      { key: 'ordered', label: 'Numbered', kind: 'checkbox' },
    ],
    events: [],
  },
  divider: {
    type: 'divider',
    label: 'Divider',
    description: 'Horizontal line',
    category: 'Content',
    icon: Minus,
    container: false,
    defaultProps: {},
    defaultStyle: {},
    fields: [],
    events: [],
  },
  spacer: {
    type: 'spacer',
    label: 'Spacer',
    description: 'Empty vertical space',
    category: 'Content',
    icon: MoveVertical,
    container: false,
    defaultProps: { size: '32' },
    defaultStyle: {},
    fields: [{ key: 'size', label: 'Height (px)', kind: 'number' }],
    events: [],
  },
  input: {
    type: 'input',
    label: 'Input',
    description: 'Single-line text field',
    category: 'Forms',
    icon: TextCursorInput,
    container: false,
    defaultProps: { label: 'Label', placeholder: 'Type here…', inputType: 'text', bind: '' },
    defaultStyle: {},
    fields: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'placeholder', label: 'Placeholder', kind: 'text' },
      {
        key: 'inputType',
        label: 'Type',
        kind: 'select',
        options: ['text', 'email', 'number', 'password', 'tel', 'url', 'date'].map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) })),
      },
      BIND_FIELD,
    ],
    events: [{ name: 'enter', label: 'When Enter is pressed' }],
  },
  textarea: {
    type: 'textarea',
    label: 'Text area',
    description: 'Multi-line text field',
    category: 'Forms',
    icon: AlignLeft,
    container: false,
    defaultProps: { label: 'Message', placeholder: 'Write your message…', rows: '4', bind: '' },
    defaultStyle: {},
    fields: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'placeholder', label: 'Placeholder', kind: 'text' },
      { key: 'rows', label: 'Rows', kind: 'number' },
      BIND_FIELD,
    ],
    events: [],
  },
  checkbox: {
    type: 'checkbox',
    label: 'Checkbox',
    description: 'On/off choice',
    category: 'Forms',
    icon: SquareCheck,
    container: false,
    defaultProps: { label: 'I agree', bind: '' },
    defaultStyle: {},
    fields: [{ key: 'label', label: 'Label', kind: 'text' }, BIND_FIELD],
    events: [],
  },
  select: {
    type: 'select',
    label: 'Dropdown',
    description: 'Pick one option from a list',
    category: 'Forms',
    icon: ChevronDown,
    container: false,
    defaultProps: { label: 'Choose one', placeholder: 'Select…', options: 'Option 1\nOption 2\nOption 3', bind: '' },
    defaultStyle: {},
    fields: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'placeholder', label: 'Placeholder', kind: 'text' },
      { key: 'options', label: 'Options (one per line)', kind: 'textarea', help: 'Use "value|Label" to store a different value.' },
      BIND_FIELD,
    ],
    events: [],
  },
}

export const PALETTE: { category: Category; types: ComponentType[] }[] = [
  { category: 'Layout', types: ['section', 'container', 'row', 'card'] },
  { category: 'Content', types: ['heading', 'text', 'button', 'link', 'image', 'video', 'list', 'divider', 'spacer'] },
  { category: 'Forms', types: ['input', 'textarea', 'checkbox', 'select'] },
  { category: 'Data', types: ['repeater'] },
]

export function getMeta(type: ComponentType): ComponentMeta {
  return REGISTRY[type]
}

/** Creates a node with the component's defaults merged with the given values. */
export function createNode(
  type: ComponentType,
  props: Record<string, unknown> = {},
  style: StyleProps = {},
  children?: NodeData[],
  extra: Partial<NodeData> = {},
): NodeData {
  const meta = REGISTRY[type]
  const node: NodeData = {
    id: uid(),
    type,
    props: { ...meta.defaultProps, ...props },
    style: { ...meta.defaultStyle, ...style },
    ...extra,
  }
  if (meta.container) node.children = children ?? meta.defaultChildren?.() ?? []
  return node
}

/** Short human label for a node, used in the layers panel and selection badge. */
export function nodeLabel(node: NodeData): string {
  if (node.name) return node.name
  const meta = REGISTRY[node.type]
  const text = typeof node.props.text === 'string' ? node.props.text : typeof node.props.label === 'string' ? node.props.label : ''
  const snippet = text.replace(/\s+/g, ' ').trim()
  return snippet ? `${meta.label}: ${snippet.length > 24 ? `${snippet.slice(0, 24)}…` : snippet}` : meta.label
}
