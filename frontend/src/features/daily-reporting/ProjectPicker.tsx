import { useMemo, useState } from 'react'
import './ProjectPicker.css'

// Mock data matching the design. Replace with API data once backend is wired in.
const MOCK_PROJECT_GROUPS = [
  {
    client: 'אל על נתיבי אוויר לישראל',
    projects: ['El Al Website', 'El Al Globaly', 'El Al Cargo', 'El Al Crew-Hub'],
  },
  {
    client: 'תעשייה אווירית',
    projects: ['Project name'],
  },
  {
    client: 'abra IT',
    projects: ['abra Marketing', 'Dabra app', 'abra - Time reporting app'],
  },
]

interface ProjectGroup {
  client: string
  projects: string[]
}

interface ProjectPickerProps {
  selected?: string
  onSelect: (value: string) => void
  onClose: () => void
  onBack?: () => void
  groups?: ProjectGroup[]
}

export default function ProjectPicker({
  selected,
  onSelect,
  onClose,
  onBack,
  groups = MOCK_PROJECT_GROUPS,
}: ProjectPickerProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map(g => ({
        ...g,
        projects: g.projects.filter(
          p =>
            p.toLowerCase().includes(q) ||
            g.client.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.projects.length > 0)
  }, [query, groups])

  const handleBack = onBack || onClose

  return (
    <div className="project-picker" dir="rtl">
      <header className="pp-header">
        <button className="pp-icon-btn" onClick={onClose} aria-label="סגור">×</button>
        <div className="pp-header-right">
          <h2 className="pp-title">בחירת פרויקט</h2>
          <button className="pp-icon-btn outlined" onClick={handleBack} aria-label="חזרה">›</button>
        </div>
      </header>

      <div className="pp-search">
        <svg className="pp-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          className="pp-search-input"
          placeholder="חיפוש..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="pp-groups">
        {filtered.length === 0 ? (
          <div className="pp-empty">לא נמצאו פרויקטים</div>
        ) : (
          filtered.map(group => (
            <div key={group.client} className="pp-group">
              <div className="pp-group-label">{group.client}</div>
              <div className="pp-list">
                {group.projects.map(proj => {
                  const isSel = proj === selected
                  return (
                    <button
                      key={proj}
                      type="button"
                      className={isSel ? 'pp-item selected' : 'pp-item'}
                      onClick={() => onSelect(proj)}
                    >
                      <span className="pp-item-text">{proj}</span>
                      {isSel && (
                        <span className="pp-check" aria-hidden="true">
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
