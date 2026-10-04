import { useEffect, useState } from 'react'
import { copyNode, deleteNode, duplicateNode, pasteNode } from '../editor/operations'
import { saveProject } from '../editor/storage'
import { currentPage, useEditor } from '../editor/store'
import { findParent } from '../editor/tree'
import type { Project } from '../runtime/types'
import { Canvas } from './Canvas'
import { Inspector } from './Inspector'
import { LeftPanel } from './LeftPanel'
import { Preview } from './Preview'
import { TopBar, type SaveStatus } from './TopBar'

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || !!target.closest('input, textarea, select, [contenteditable]')
}

export function Editor({ project, onExit }: { project: Project; onExit: () => void }) {
  const open = useEditor((s) => s.open)
  const close = useEditor((s) => s.close)
  const loaded = useEditor((s) => s.project?.id === project.id)
  const previewing = useEditor((s) => s.previewing)
  const variables = useEditor((s) => s.project?.variables)
  const [status, setStatus] = useState<SaveStatus>('saved')

  useEffect(() => {
    open(project)
    return () => close()
  }, [project, open, close])

  // Autosave shortly after every change, and when leaving the page.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    // Remember the latest edit: on unmount the store may already be closed.
    let latest: Project | null = null
    const save = () => {
      if (latest) setStatus(saveProject(latest) ? 'saved' : 'error')
      latest = null
    }
    const unsubscribe = useEditor.subscribe((state, prev) => {
      if (!state.project || state.project === prev.project || !prev.project || state.project.id !== prev.project.id) return
      latest = state.project
      setStatus('saving')
      clearTimeout(timer)
      timer = setTimeout(save, 400)
    })
    window.addEventListener('beforeunload', save)
    return () => {
      unsubscribe()
      clearTimeout(timer)
      save()
      window.removeEventListener('beforeunload', save)
    }
  }, [])

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = useEditor.getState()
      if (state.previewing) {
        if (e.key === 'Escape') state.setPreviewing(false)
        return
      }
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      const typing = isTyping(e.target)
      if (mod && key === 'z' && !typing) {
        e.preventDefault()
        if (e.shiftKey) state.redo()
        else state.undo()
        return
      }
      if (mod && key === 'y' && !typing) {
        e.preventDefault()
        state.redo()
        return
      }
      if (typing) return
      if (mod && key === 'v' && state.clipboard) {
        e.preventDefault()
        pasteNode()
        return
      }
      if (!state.selectedId) return
      const page = currentPage(state)
      const isRoot = page?.root.id === state.selectedId
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isRoot) {
        e.preventDefault()
        deleteNode(state.selectedId)
      } else if (mod && key === 'd' && !isRoot) {
        e.preventDefault()
        duplicateNode(state.selectedId)
      } else if (mod && key === 'c' && !isRoot) {
        copyNode(state.selectedId)
      } else if (mod && key === 'x' && !isRoot) {
        copyNode(state.selectedId)
        deleteNode(state.selectedId)
      } else if (e.key === 'Escape') {
        const parent = page && findParent(page.root, state.selectedId)
        state.select(parent ? parent.parent.id : null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!loaded) return null

  return (
    <div className="ed-shell">
      <TopBar status={status} onExit={onExit} />
      <div className="ed-main">
        <LeftPanel />
        <main className="ed-center" aria-label="Canvas">
          <Canvas />
        </main>
        <Inspector />
      </div>
      {previewing && <Preview />}
      <datalist id="ed-variable-names">
        {variables?.map((v) => <option key={v.id} value={v.name} />)}
      </datalist>
    </div>
  )
}
