import { describe, expect, it } from 'vitest'
import { coerce, getIn, parseVariableValue, setIn, splitPath } from '../state'

describe('state helpers', () => {
  it('parses initial values by type', () => {
    expect(parseVariableValue('number', '42')).toBe(42)
    expect(parseVariableValue('number', 'abc')).toBe(0)
    expect(parseVariableValue('boolean', 'TRUE')).toBe(true)
    expect(parseVariableValue('json', '[1,2]')).toEqual([1, 2])
    expect(parseVariableValue('json', '{bad')).toBeNull()
    expect(parseVariableValue('string', 'hi')).toBe('hi')
  })

  it('coerces values to a variable type', () => {
    expect(coerce('5', 'number')).toBe(5)
    expect(coerce('', 'number')).toBe(0)
    expect(coerce('true', 'boolean')).toBe(true)
    expect(coerce(12, 'string')).toBe('12')
    expect(coerce('[1]', 'json')).toEqual([1])
    expect(coerce({ a: 1 }, 'string')).toBe('{"a":1}')
  })

  it('splits paths in both notations', () => {
    expect(splitPath('todos.0.done')).toEqual(['todos', '0', 'done'])
    expect(splitPath('todos[0].done')).toEqual(['todos', '0', 'done'])
  })

  it('sets nested values immutably', () => {
    const state = { todos: [{ done: false }, { done: false }], other: { a: 1 } }
    const next = setIn(state, ['todos', '1', 'done'], true) as typeof state
    expect(next.todos[1].done).toBe(true)
    expect(state.todos[1].done).toBe(false)
    expect(next.other).toBe(state.other)
    expect(getIn(next, ['todos', '1', 'done'])).toBe(true)
    expect(setIn({}, ['a', 'b'], 1)).toEqual({ a: { b: 1 } })
  })

  it('refuses prototype keys', () => {
    const next = setIn({}, ['__proto__', 'polluted'], true) as Record<string, unknown>
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(next).toEqual({})
  })
})
