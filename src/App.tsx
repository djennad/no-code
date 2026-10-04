import { useEffect, useState } from 'react'
import { loadProject } from './editor/storage'
import type { Project } from './runtime/types'
import { Dashboard } from './ui/Dashboard'
import { Editor } from './ui/Editor'

type Route = { view: 'dashboard' } | { view: 'editor'; project: Project }

function routeFromHash(): Route {
  const match = /^#\/project\/([\w-]+)/.exec(window.location.hash)
  const project = match ? loadProject(match[1]) : null
  return project ? { view: 'editor', project } : { view: 'dashboard' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route.view === 'editor') {
    return <Editor key={route.project.id} project={route.project} onExit={() => (window.location.hash = '#/')} />
  }
  return <Dashboard onOpen={(id) => (window.location.hash = `#/project/${id}`)} />
}
