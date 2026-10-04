// The project model shared by the editor, the live runtime and exported sites.

export type ComponentType =
  | 'page'
  | 'section'
  | 'container'
  | 'row'
  | 'card'
  | 'repeater'
  | 'heading'
  | 'text'
  | 'button'
  | 'link'
  | 'image'
  | 'video'
  | 'list'
  | 'divider'
  | 'spacer'
  | 'input'
  | 'textarea'
  | 'checkbox'
  | 'select'

export interface StyleProps {
  // Layout (applies to the element that holds children)
  direction?: 'row' | 'column'
  gap?: string
  alignItems?: 'stretch' | 'flex-start' | 'center' | 'flex-end'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  wrap?: boolean
  // Spacing
  padding?: string
  margin?: string
  // Size
  width?: string
  maxWidth?: string
  height?: string
  minHeight?: string
  flex?: string
  // Typography
  fontSize?: string
  fontWeight?: string
  color?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  lineHeight?: string
  letterSpacing?: string
  // Decoration
  background?: string
  backgroundImage?: string
  borderWidth?: string
  borderColor?: string
  borderRadius?: string
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  opacity?: string
}

export type EventName = 'click' | 'enter' | 'load'

export interface ActionBase {
  id: string
  /** Optional expression; the action is skipped when it evaluates to a falsy value. */
  condition?: string
}

export type Action =
  | (ActionBase & { type: 'navigate'; pageId: string })
  | (ActionBase & { type: 'openUrl'; url: string; newTab: boolean })
  | (ActionBase & { type: 'setVariable'; variable: string; value: string })
  | (ActionBase & { type: 'increment'; variable: string; amount: string })
  | (ActionBase & { type: 'toggle'; variable: string })
  | (ActionBase & { type: 'appendToList'; variable: string; value: string })
  | (ActionBase & { type: 'removeFromList'; variable: string; index: string })
  | (ActionBase & { type: 'alert'; message: string })
  | (ActionBase & {
      type: 'fetch'
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      url: string
      body: string
      resultVariable: string
      errorVariable?: string
    })

export type ActionType = Action['type']

export interface NodeData {
  id: string
  type: ComponentType
  /** Display name shown in the layers panel. */
  name?: string
  props: Record<string, unknown>
  style: StyleProps
  children?: NodeData[]
  events?: Partial<Record<EventName, Action[]>>
  /** Expression; the node is only rendered when it is truthy. */
  visibleIf?: string
  hideOn?: 'none' | 'mobile' | 'desktop'
  /** HTML id, so links like "#pricing" can scroll to this element. */
  anchor?: string
}

export interface Page {
  id: string
  name: string
  /** URL slug without leading slash. The home page uses an empty path. */
  path: string
  title: string
  root: NodeData
}

export type VariableType = 'string' | 'number' | 'boolean' | 'json'

export interface Variable {
  id: string
  name: string
  type: VariableType
  /** Initial value, stored as text and parsed according to `type`. */
  initial: string
}

export interface Theme {
  primary: string
  text: string
  background: string
  font: string
  radius: string
}

export interface Project {
  id: string
  name: string
  version: 1
  homePageId: string
  pages: Page[]
  variables: Variable[]
  theme: Theme
  createdAt: number
  updatedAt: number
}
