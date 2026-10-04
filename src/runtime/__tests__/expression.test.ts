import { describe, expect, it } from 'vitest'
import { evaluate, interpolate, isTruthy, resolveValue, validateExpression } from '../expression'

const scope = {
  name: 'Ada',
  count: 3,
  user: { profile: { city: 'Paris' } },
  todos: [
    { title: 'A', done: true },
    { title: 'B', done: false },
  ],
  empty: '',
}

describe('evaluate', () => {
  it('reads variables and nested paths', () => {
    expect(evaluate('name', scope)).toBe('Ada')
    expect(evaluate('user.profile.city', scope)).toBe('Paris')
    expect(evaluate('todos.1.title', scope)).toBe('B')
    expect(evaluate('todos[0].done', scope)).toBe(true)
    expect(evaluate('todos.length', scope)).toBe(2)
    expect(evaluate('missing.deep.path', scope)).toBeUndefined()
  })

  it('does arithmetic, comparison and logic', () => {
    expect(evaluate('count * 2 + 1', scope)).toBe(7)
    expect(evaluate('(count + 1) * 2', scope)).toBe(8)
    expect(evaluate('count % 2', scope)).toBe(1)
    expect(evaluate('-count', scope)).toBe(-3)
    expect(evaluate('count >= 3 && name == "Ada"', scope)).toBe(true)
    expect(evaluate("empty != ''", scope)).toBe(false)
    expect(evaluate('!todos.0.done', scope)).toBe(false)
    expect(evaluate('missing || "fallback"', scope)).toBe('fallback')
    expect(evaluate('"Hi " + name', scope)).toBe('Hi Ada')
  })

  it('supports the ternary operator', () => {
    expect(evaluate("count > 2 ? 'many' : 'few'", scope)).toBe('many')
    expect(evaluate("todos.1.done ? 'yes' : 'no'", scope)).toBe('no')
  })

  it('never exposes prototype internals', () => {
    expect(evaluate('constructor', scope)).toBeUndefined()
    expect(evaluate('name.constructor', scope)).toBeUndefined()
    expect(evaluate('user.__proto__', scope)).toBeUndefined()
    expect(evaluate('toString', scope)).toBeUndefined()
  })

  it('returns undefined for invalid expressions and reports errors', () => {
    expect(evaluate('count +', scope)).toBeUndefined()
    expect(validateExpression('count +')).not.toBeNull()
    expect(validateExpression('a.b == 1')).toBeNull()
    expect(validateExpression('"unterminated')).toMatch(/Unterminated/)
  })
})

describe('templates', () => {
  it('interpolates expressions inside text', () => {
    expect(interpolate('Hello {{ name }}, you have {{count}} items', scope)).toBe('Hello Ada, you have 3 items')
    expect(interpolate('{{missing}}!', scope)).toBe('!')
    expect(interpolate('No template', scope)).toBe('No template')
    expect(interpolate('{{todos.0}}', scope)).toBe('{"title":"A","done":true}')
  })

  it('keeps value types for a single expression', () => {
    expect(resolveValue('{{count}}', scope)).toBe(3)
    expect(resolveValue('{{ todos }}', scope)).toBe(scope.todos)
    expect(resolveValue('{{count}} items', scope)).toBe('3 items')
    expect(resolveValue('{{a}} and {{b}}', { a: 1, b: 2 })).toBe('1 and 2')
  })

  it('treats empty conditions as true', () => {
    expect(isTruthy(undefined, scope)).toBe(true)
    expect(isTruthy('  ', scope)).toBe(true)
    expect(isTruthy('count > 5', scope)).toBe(false)
  })
})
