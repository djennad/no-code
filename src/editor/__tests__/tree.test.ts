import { describe, expect, it } from 'vitest'
import type { NodeData } from '../../runtime/types'
import { cloneTree, contains, findNode, findParent, insertNode, moveNode, pathTo, removeNode } from '../tree'

function node(id: string, children?: NodeData[]): NodeData {
  return { id, type: children ? 'container' : 'text', props: {}, style: {}, ...(children ? { children } : {}) }
}

function tree() {
  return node('root', [node('a', [node('a1'), node('a2')]), node('b'), node('c', [])])
}

const ids = (n: NodeData) => (n.children ?? []).map((c) => c.id)

describe('tree', () => {
  it('finds nodes, parents and paths', () => {
    const root = tree()
    expect(findNode(root, 'a2')?.id).toBe('a2')
    expect(findParent(root, 'a2')).toEqual({ parent: root.children![0], index: 1 })
    expect(pathTo(root, 'a1').map((n) => n.id)).toEqual(['root', 'a', 'a1'])
    expect(contains(root.children![0], 'a1')).toBe(true)
    expect(contains(root.children![1], 'a1')).toBe(false)
  })

  it('inserts and removes', () => {
    const root = tree()
    insertNode(root, 'c', 0, node('new'))
    expect(ids(findNode(root, 'c')!)).toEqual(['new'])
    expect(removeNode(root, 'b')?.id).toBe('b')
    expect(ids(root)).toEqual(['a', 'c'])
  })

  it('moves within the same parent using pre-move indexes', () => {
    const root = tree()
    expect(moveNode(root, 'a', 'root', 3)).toBe(true)
    expect(ids(root)).toEqual(['b', 'c', 'a'])
    expect(moveNode(root, 'a', 'root', 0)).toBe(true)
    expect(ids(root)).toEqual(['a', 'b', 'c'])
    // Dropping right before or after itself is a no-op.
    expect(moveNode(root, 'b', 'root', 1)).toBe(false)
    expect(moveNode(root, 'b', 'root', 2)).toBe(false)
  })

  it('moves across parents and refuses to move into itself', () => {
    const root = tree()
    expect(moveNode(root, 'b', 'a', 1)).toBe(true)
    expect(ids(findNode(root, 'a')!)).toEqual(['a1', 'b', 'a2'])
    expect(moveNode(root, 'a', 'a', 0)).toBe(false)
    expect(moveNode(root, 'a', 'a1', 0)).toBe(false)
  })

  it('clones with fresh ids', () => {
    const original = tree()
    original.children![1].events = { click: [{ id: 'act', type: 'alert', message: 'hi' }] }
    const copy = cloneTree(original)
    expect(copy.id).not.toBe('root')
    expect(copy.children![0].children!.map((c) => c.id)).not.toContain('a1')
    expect(copy.children![1].events!.click![0].id).not.toBe('act')
    expect(copy.children![1].events!.click![0]).toMatchObject({ type: 'alert', message: 'hi' })
  })
})
