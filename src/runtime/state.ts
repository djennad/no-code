import type { Project, Variable, VariableType } from './types'

export type State = Record<string, unknown>

export function parseVariableValue(type: VariableType, raw: string): unknown {
  switch (type) {
    case 'number': {
      const n = Number(raw)
      return Number.isFinite(n) ? n : 0
    }
    case 'boolean':
      return raw.trim().toLowerCase() === 'true'
    case 'json':
      try {
        return raw.trim() ? JSON.parse(raw) : null
      } catch {
        return null
      }
    default:
      return raw
  }
}

export function initialState(project: Project): State {
  const state: State = {}
  for (const v of project.variables) state[v.name] = parseVariableValue(v.type, v.initial)
  return state
}

/** Converts a value to the declared type of the variable it is stored in. */
export function coerce(value: unknown, type: VariableType | undefined): unknown {
  switch (type) {
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(n) ? n : 0
    }
    case 'boolean':
      return typeof value === 'string' ? value.trim().toLowerCase() === 'true' : !!value
    case 'string':
      return typeof value === 'string' ? value : value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    case 'json':
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }
      return value
    default:
      return value
  }
}

/** Splits `todos[0].done` or `todos.0.done` into ['todos', '0', 'done']. */
export function splitPath(path: string): string[] {
  return path
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .map((p) => p.trim())
    .filter(Boolean)
}

const BLOCKED = new Set(['__proto__', 'constructor', 'prototype'])

export function getIn(obj: unknown, keys: string[]): unknown {
  let cur = obj
  for (const k of keys) {
    if (cur === null || typeof cur !== 'object' || BLOCKED.has(k)) return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

/** Returns a copy of `obj` with the value at `keys` replaced. */
export function setIn(obj: unknown, keys: string[], value: unknown): unknown {
  if (keys.length === 0) return value
  const [head, ...rest] = keys
  if (BLOCKED.has(head)) return obj
  if (Array.isArray(obj)) {
    const copy = obj.slice()
    const index = Number(head)
    if (!Number.isInteger(index) || index < 0) return obj
    copy[index] = setIn(copy[index], rest, value)
    return copy
  }
  const base = obj !== null && typeof obj === 'object' ? (obj as Record<string, unknown>) : {}
  return { ...base, [head]: setIn(base[head], rest, value) }
}

export function findVariable(project: Project, name: string): Variable | undefined {
  return project.variables.find((v) => v.name === name)
}
