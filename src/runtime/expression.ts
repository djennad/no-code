// A small, safe expression language used for bindings, templates and conditions.
// It supports literals, variable paths (a.b[0].c), arithmetic, comparison,
// logical operators and the ternary operator. Nothing is ever passed to eval().

export type Scope = Record<string, unknown>

type Node =
  | { k: 'lit'; v: unknown }
  | { k: 'id'; name: string }
  | { k: 'member'; obj: Node; prop: Node }
  | { k: 'unary'; op: '!' | '-'; arg: Node }
  | { k: 'bin'; op: string; left: Node; right: Node }
  | { k: 'cond'; test: Node; yes: Node; no: Node }

type Token =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }

const OPERATORS = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '<', '>', '+', '-', '*', '/', '%', '!', '.', '[', ']', '(', ')', '?', ':']

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? '') && !isMemberDot(tokens))) {
      // After a member dot (todos.1.done) only an integer index is allowed.
      const prev = tokens[tokens.length - 1]
      const digits = prev && prev.t === 'op' && prev.v === '.' ? /[0-9]/ : /[0-9.]/
      let j = i
      while (j < src.length && digits.test(src[j])) j++
      tokens.push({ t: 'num', v: Number(src.slice(i, j)) })
      i = j
      continue
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1
      let out = ''
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\' && j + 1 < src.length) {
          const next = src[j + 1]
          out += next === 'n' ? '\n' : next === 't' ? '\t' : next
          j += 2
        } else {
          out += src[j++]
        }
      }
      if (j >= src.length) throw new Error('Unterminated string')
      tokens.push({ t: 'str', v: out })
      i = j + 1
      continue
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j++
      tokens.push({ t: 'id', v: src.slice(i, j) })
      i = j
      continue
    }
    const op = OPERATORS.find((o) => src.startsWith(o, i))
    if (!op) throw new Error(`Unexpected character "${ch}"`)
    tokens.push({ t: 'op', v: op })
    i += op.length
  }
  return tokens
}

// `a.0` should be member access with key 0, not the number `.0`.
function isMemberDot(tokens: Token[]): boolean {
  const prev = tokens[tokens.length - 1]
  return !!prev && (prev.t === 'id' || (prev.t === 'op' && (prev.v === ']' || prev.v === ')')))
}

class Parser {
  private pos = 0
  private tokens: Token[]
  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): Node {
    if (this.tokens.length === 0) return { k: 'lit', v: undefined }
    const node = this.ternary()
    if (this.pos < this.tokens.length) throw new Error('Unexpected token')
    return node
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private isOp(...ops: string[]): string | null {
    const tok = this.peek()
    return tok && tok.t === 'op' && ops.includes(tok.v) ? tok.v : null
  }

  private expectOp(op: string) {
    if (!this.isOp(op)) throw new Error(`Expected "${op}"`)
    this.pos++
  }

  private ternary(): Node {
    const test = this.binary(0)
    if (this.isOp('?')) {
      this.pos++
      const yes = this.ternary()
      this.expectOp(':')
      return { k: 'cond', test, yes, no: this.ternary() }
    }
    return test
  }

  private static LEVELS = [['||'], ['&&'], ['==', '!=', '===', '!=='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']]

  private binary(level: number): Node {
    if (level >= Parser.LEVELS.length) return this.unary()
    let left = this.binary(level + 1)
    let op: string | null
    while ((op = this.isOp(...Parser.LEVELS[level]))) {
      this.pos++
      left = { k: 'bin', op, left, right: this.binary(level + 1) }
    }
    return left
  }

  private unary(): Node {
    const op = this.isOp('!', '-')
    if (op) {
      this.pos++
      return { k: 'unary', op: op as '!' | '-', arg: this.unary() }
    }
    return this.postfix()
  }

  private postfix(): Node {
    let node = this.primary()
    for (;;) {
      if (this.isOp('.')) {
        this.pos++
        const tok = this.peek()
        if (!tok || (tok.t !== 'id' && tok.t !== 'num')) throw new Error('Expected property name')
        this.pos++
        node = { k: 'member', obj: node, prop: { k: 'lit', v: String(tok.v) } }
      } else if (this.isOp('[')) {
        this.pos++
        const prop = this.ternary()
        this.expectOp(']')
        node = { k: 'member', obj: node, prop }
      } else {
        return node
      }
    }
  }

  private primary(): Node {
    const tok = this.peek()
    if (!tok) throw new Error('Unexpected end of expression')
    this.pos++
    if (tok.t === 'num' || tok.t === 'str') return { k: 'lit', v: tok.v }
    if (tok.t === 'id') {
      if (tok.v === 'true') return { k: 'lit', v: true }
      if (tok.v === 'false') return { k: 'lit', v: false }
      if (tok.v === 'null') return { k: 'lit', v: null }
      return { k: 'id', name: tok.v }
    }
    if (tok.v === '(') {
      const node = this.ternary()
      this.expectOp(')')
      return node
    }
    throw new Error(`Unexpected "${tok.v}"`)
  }
}

const cache = new Map<string, Node>()

export function parseExpression(src: string): Node {
  let node = cache.get(src)
  if (!node) {
    node = new Parser(tokenize(src)).parse()
    if (cache.size > 500) cache.clear()
    cache.set(src, node)
  }
  return node
}

const BLOCKED = new Set(['__proto__', 'constructor', 'prototype'])

export function getProperty(obj: unknown, key: unknown): unknown {
  if (obj === null || obj === undefined) return undefined
  const k = String(key)
  if (BLOCKED.has(k)) return undefined
  if (k === 'length' && (typeof obj === 'string' || Array.isArray(obj))) return obj.length
  if (typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, k)) {
    return (obj as Record<string, unknown>)[k]
  }
  return undefined
}

function evalNode(node: Node, scope: Scope): unknown {
  switch (node.k) {
    case 'lit':
      return node.v
    case 'id':
      return getProperty(scope, node.name)
    case 'member':
      return getProperty(evalNode(node.obj, scope), evalNode(node.prop, scope))
    case 'unary': {
      const v = evalNode(node.arg, scope)
      return node.op === '!' ? !v : -Number(v)
    }
    case 'cond':
      return evalNode(node.test, scope) ? evalNode(node.yes, scope) : evalNode(node.no, scope)
    case 'bin': {
      if (node.op === '&&') return evalNode(node.left, scope) && evalNode(node.right, scope)
      if (node.op === '||') return evalNode(node.left, scope) || evalNode(node.right, scope)
      const a = evalNode(node.left, scope) as never
      const b = evalNode(node.right, scope) as never
      switch (node.op) {
        case '==':
        case '===':
          return a == b
        case '!=':
        case '!==':
          return a != b
        case '<':
          return a < b
        case '>':
          return a > b
        case '<=':
          return a <= b
        case '>=':
          return a >= b
        case '+':
          return typeof a === 'string' || typeof b === 'string' ? stringify(a) + stringify(b) : Number(a) + Number(b)
        case '-':
          return Number(a) - Number(b)
        case '*':
          return Number(a) * Number(b)
        case '/':
          return Number(a) / Number(b)
        case '%':
          return Number(a) % Number(b)
      }
      return undefined
    }
  }
}

/** Evaluates an expression. Invalid expressions evaluate to `undefined`. */
export function evaluate(src: string, scope: Scope): unknown {
  try {
    return evalNode(parseExpression(src), scope)
  } catch {
    return undefined
  }
}

/** Returns an error message for an invalid expression, or null when it is valid. */
export function validateExpression(src: string): string | null {
  try {
    parseExpression(src)
    return null
  } catch (err) {
    return (err as Error).message
  }
}

/** Evaluates a condition; an empty condition counts as true. */
export function isTruthy(src: string | undefined, scope: Scope): boolean {
  if (!src || !src.trim()) return true
  return !!evaluate(src, scope)
}

export function stringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

const TEMPLATE_RE = /\{\{([\s\S]+?)\}\}/g
const SINGLE_RE = /^\s*\{\{([\s\S]+?)\}\}\s*$/

export function hasTemplate(text: string): boolean {
  return text.includes('{{')
}

/** Replaces every {{ expression }} in `text` with its string value. */
export function interpolate(text: unknown, scope: Scope): string {
  const str = typeof text === 'string' ? text : stringify(text)
  if (!hasTemplate(str)) return str
  return str.replace(TEMPLATE_RE, (_, expr: string) => stringify(evaluate(expr, scope)))
}

/**
 * Like interpolate, but when the text is a single {{ expression }} the raw value
 * is returned so numbers, booleans, lists and objects keep their type.
 */
export function resolveValue(text: unknown, scope: Scope): unknown {
  if (typeof text !== 'string') return text
  const single = SINGLE_RE.exec(text)
  if (single && !single[1].includes('{{')) return evaluate(single[1], scope)
  return interpolate(text, scope)
}
