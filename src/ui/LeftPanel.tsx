import { Database, FileText, Layers, Palette, Plus, type LucideIcon } from 'lucide-react'
import { useEditor, type LeftTab } from '../editor/store'
import { AddPanel } from './AddPanel'
import { DataPanel } from './DataPanel'
import { LayersPanel } from './LayersPanel'
import { PagesPanel } from './PagesPanel'
import { ThemePanel } from './ThemePanel'

const TABS: { id: LeftTab; label: string; icon: LucideIcon }[] = [
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'theme', label: 'Theme', icon: Palette },
]

export function LeftPanel() {
  const tab = useEditor((s) => s.leftTab)
  const setTab = useEditor((s) => s.setLeftTab)
  return (
    <aside className="ed-left" aria-label="Tools">
      <nav className="ed-rail" role="tablist" aria-orientation="vertical">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)} title={label}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="ed-left-body" role="tabpanel">
        {tab === 'add' && <AddPanel />}
        {tab === 'layers' && <LayersPanel />}
        {tab === 'pages' && <PagesPanel />}
        {tab === 'data' && <DataPanel />}
        {tab === 'theme' && <ThemePanel />}
      </div>
    </aside>
  )
}
