import { beforeEach, describe, expect, it } from 'vitest'
import { BLOCKS } from '../blocks'
import {
  addBlock,
  addNode,
  addPage,
  copyNode,
  deleteNode,
  deletePage,
  duplicateNode,
  pasteNode,
  relocateNode,
  setHomePage,
  setProp,
  updatePage,
} from '../operations'
import { createNode } from '../registry'
import { currentPage, useEditor } from '../store'
import { TEMPLATES } from '../templates'

const state = () => useEditor.getState()
const page = () => currentPage(state())!
const childIds = () => page().root.children!.map((c) => c.id)

beforeEach(() => {
  state().open(TEMPLATES[0].create('Test'))
})

describe('editing operations', () => {
  it('adds, moves, duplicates and deletes nodes with undo', () => {
    const a = createNode('heading')
    const b = createNode('text')
    addNode(a, page().root.id, 0)
    addNode(b, page().root.id, 1)
    expect(childIds()).toEqual([a.id, b.id])
    expect(state().selectedId).toBe(b.id)

    relocateNode(b.id, page().root.id, 0)
    expect(childIds()).toEqual([b.id, a.id])

    duplicateNode(a.id)
    expect(page().root.children).toHaveLength(3)
    expect(page().root.children![2].props).toEqual(page().root.children![1].props)

    deleteNode(b.id)
    expect(page().root.children).toHaveLength(2)
    state().undo()
    expect(page().root.children).toHaveLength(3)
    state().redo()
    expect(page().root.children).toHaveLength(2)
  })

  it('merges consecutive edits of the same field into one undo step', () => {
    const node = createNode('text', { text: '' })
    addNode(node, page().root.id, 0)
    const steps = state().past.length
    for (const text of ['H', 'He', 'Hel', 'Hello']) setProp(node.id, 'text', text)
    expect(state().past.length).toBe(steps + 1)
    state().undo()
    expect(page().root.children![0].props.text).toBe('')
  })

  it('copies and pastes a fresh copy', () => {
    const node = createNode('button', { text: 'Buy' })
    addNode(node, page().root.id, 0)
    copyNode(node.id)
    pasteNode()
    const [first, second] = page().root.children!
    expect(second.props.text).toBe('Buy')
    expect(second.id).not.toBe(first.id)
  })

  it('adds blocks together with the variables they need', () => {
    const contact = BLOCKS.find((b) => b.id === 'contact')!
    addBlock(contact, page().root.id, 0)
    addBlock(contact, page().root.id, 1)
    expect(state().project!.variables.map((v) => v.name)).toEqual(['contactName', 'contactEmail', 'contactMessage'])
  })

  it('manages pages, unique paths and the home page', () => {
    const about = addPage('About')!
    const about2 = addPage('About')!
    expect(about.path).toBe('about')
    expect(about2.path).toBe('about-2')
    expect(state().pageId).toBe(about2.id)

    updatePage(about2.id, { path: 'about' })
    expect(state().project!.pages.find((p) => p.id === about2.id)!.path).not.toBe('about')

    setHomePage(about.id)
    const project = state().project!
    expect(project.homePageId).toBe(about.id)
    expect(project.pages.find((p) => p.id === about.id)!.path).toBe('')
    expect(project.pages[0].path).toBe('home')

    deletePage(about.id)
    expect(state().project!.homePageId).toBe(state().project!.pages[0].id)
    expect(state().project!.pages[0].path).toBe('')
  })
})
