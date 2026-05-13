import { useMemo, useState } from 'react'
import './ProjectPicker.css'

export type TaskOption = {
  id: number
  name: string
}

export type ProjectNode = {
  id: number
  name: string
  tasks: TaskOption[]
}

export type ClientGroup = {
  client: string
  clientId: number
  projects: ProjectNode[]
}

type PickerView =
  | { level: 'grouped' }
  | { level: 'tasks'; clientGroup: ClientGroup; projectNode: ProjectNode }

type SearchResult = {
  task: TaskOption
  projectName: string
  clientName: string
}

type ProjectPickerProps = {
  selected?: number | null
  onSelect: (taskId: number, taskName: string, projectName: string) => void
  onClose: () => void
  onBack?: () => void
  groups?: ClientGroup[]
}

export default function ProjectPicker({
  selected = null,
  onSelect,
  onClose,
  onBack,
  groups = [],
}: ProjectPickerProps) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<PickerView>({ level: 'grouped' })

  const searchResults = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return groups.flatMap(group =>
      group.projects.flatMap(project =>
        project.tasks
          .filter(task =>
            task.name.toLowerCase().includes(q) ||
            project.name.toLowerCase().includes(q) ||
            group.client.toLowerCase().includes(q)
          )
          .map(task => ({ task, projectName: project.name, clientName: group.client }))
      )
    )
  }, [query, groups])

  const isSearching = query.trim().length > 0

  // Navigate back or clear search
  const handleBack = () => {
    if (isSearching) { setQuery(''); return }
    if (view.level === 'tasks') { setView({ level: 'grouped' }); return }
    if (onBack) onBack(); else onClose()
  }

  const title =
    isSearching ? 'חיפוש משימה' :
    view.level === 'tasks' ? view.projectNode.name :
    'בחירת פרויקט'

  // Handle project row tap in grouped view — go to tasks or auto-select single task
  const handleProjectTap = (group: ClientGroup, project: ProjectNode) => {
    if (project.tasks.length === 1) {
      onSelect(project.tasks[0].id, project.tasks[0].name, project.name)
    } else if (project.tasks.length > 1) {
      setView({ level: 'tasks', clientGroup: group, projectNode: project })
    }
  }

  return (
    <div className="pp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pp-sheet" dir="rtl" role="dialog" aria-modal="true" aria-label="בחירת פרויקט">
        <div className="pp-handle" aria-hidden="true" />

        <div className="pp-scroll">
          {/* Header: in RTL flex-row, first child = physical right, last = physical left */}
          <div className="pp-header">
            {/* Back › — physical right (leading in RTL) */}
            <button className="pp-icon-btn" onClick={handleBack} aria-label="חזרה">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7 4l5 5-5 5" stroke="#848891" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2 className="pp-title">{title}</h2>
            {/* × Close — physical left (trailing in RTL) */}
            <button className="pp-icon-btn" onClick={onClose} aria-label="סגור">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="pp-search-field">
            <svg className="pp-search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="#0C69FF" strokeWidth="1.4"/>
              <path d="M13.5 13.5l3.5 3.5" stroke="#0C69FF" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              className="pp-search-input"
              placeholder="חיפוש..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {/* List */}
          <div className="pp-groups">
            {isSearching ? (
              searchResults.length === 0 ? (
                <p className="pp-empty">לא נמצאו משימות</p>
              ) : (
                <div className="pp-card">
                  {searchResults.map(({ task, projectName, clientName }, idx) => {
                    const isSelected = task.id === selected
                    return (
                      <button
                        key={`${projectName}-${task.id}`}
                        type="button"
                        className={`pp-row${isSelected ? ' pp-row--selected' : ''}${idx > 0 ? ' pp-row--sep' : ''}`}
                        onClick={() => onSelect(task.id, task.name, projectName)}
                      >
                        {isSelected && <CheckIcon />}
                        <span className="pp-row-title">{task.name}</span>
                        <span className="pp-row-sub">{clientName} · {projectName}</span>
                      </button>
                    )
                  })}
                </div>
              )
            ) : groups.length === 0 ? (
              <p className="pp-empty">לא הוקצו לך משימות — פנה למנהל</p>
            ) : view.level === 'grouped' ? (
              groups.map(group => (
                <div key={group.clientId} className="pp-group">
                  <p className="pp-group-label">{group.client}</p>
                  <div className="pp-card">
                    {group.projects.map((project, idx) => (
                      <button
                        key={project.id}
                        type="button"
                        className={`pp-row${idx > 0 ? ' pp-row--sep' : ''}`}
                        onClick={() => handleProjectTap(group, project)}
                      >
                        <span className="pp-row-title">{project.name}</span>
                        {project.tasks.length > 1 && (
                          <svg width="11" height="19" viewBox="0 0 11 19" fill="none" className="pp-chevron-icon" aria-hidden="true">
                            <path d="M1 1l9 8.5L1 18" stroke="rgba(24,24,24,0.24)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="pp-group">
                <p className="pp-group-label">{view.clientGroup.client}</p>
                <div className="pp-card">
                  {view.projectNode.tasks.map((task, idx) => {
                    const isSelected = task.id === selected
                    return (
                      <button
                        key={task.id}
                        type="button"
                        className={`pp-row${isSelected ? ' pp-row--selected' : ''}${idx > 0 ? ' pp-row--sep' : ''}`}
                        onClick={() => onSelect(task.id, task.name, view.projectNode.name)}
                      >
                        {isSelected && <CheckIcon />}
                        <span className="pp-row-title">{task.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="pp-bottom-bar">
          <div className="pp-bottom-row">
            <button type="button" className="pp-btn-primary" onClick={onClose}>
              המשך ובחר משימה
            </button>
            <button type="button" className="pp-btn-outline" onClick={onClose}>
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="pp-check-icon" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="#0C69FF"/>
      <path d="M5 8l2.5 2.5L11 5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
