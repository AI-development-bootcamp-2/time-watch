import { useMemo, useState } from 'react'
import './ReportForm.css'

const DAILY_STANDARD = 9
const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const LOCATIONS = ['משרד', 'לקוח', 'בית']

function formatDateHe(date) {
  const day = DAYS_HE[date.getDay()]
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `יום ${day}׳ ${dd}/${mm}/${yy}`
}

function parseTime(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h + (Number.isNaN(m) ? 0 : m) / 60
}

function hoursBetween(start, end) {
  const s = parseTime(start)
  const e = parseTime(end)
  if (s === null || e === null) return 0
  return Math.max(0, e - s)
}

function newProject(defaults = {}) {
  return {
    id: Date.now() + Math.random(),
    project: '',
    task: '',
    location: '',
    startTime: '',
    endTime: '',
    notes: '',
    ...defaults,
  }
}

export default function ReportForm({ onClose, onSave, date = new Date() }) {
  const [activeTab, setActiveTab] = useState('work')
  const [entryTime, setEntryTime] = useState('09:00')
  const [exitTime, setExitTime] = useState('18:00')
  const [projects, setProjects] = useState([
    newProject({ startTime: '09:00', endTime: '18:00' }),
  ])

  const totalHours = useMemo(
    () => projects.reduce((sum, p) => sum + hoursBetween(p.startTime, p.endTime), 0),
    [projects]
  )
  const remaining = Math.max(0, DAILY_STANDARD - totalHours)
  const progressPct = Math.min(100, (totalHours / DAILY_STANDARD) * 100)

  const updateProject = (id, field, value) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)))
  }
  const addProject = () => setProjects(prev => [...prev, newProject()])
  const removeProject = id => setProjects(prev => prev.filter(p => p.id !== id))

  const handleSave = () => {
    const payload = { date, activeTab, entryTime, exitTime, projects }
    if (onSave) onSave(payload)
    else console.log('Save report', payload)
  }

  const formatHours = h => (Number.isInteger(h) ? h : h.toFixed(1))

  return (
    <div className="report-form" dir="rtl">
      <header className="rf-header">
        <h2 className="rf-title">דיווח ידני</h2>
        <button className="rf-close" onClick={onClose} aria-label="סגור">×</button>
      </header>

      <div className="rf-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'work'}
          className={activeTab === 'work' ? 'rf-tab active' : 'rf-tab'}
          onClick={() => setActiveTab('work')}
        >
          דיווח עבודה
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'absence'}
          className={activeTab === 'absence' ? 'rf-tab active' : 'rf-tab'}
          onClick={() => setActiveTab('absence')}
        >
          דיווח העדרות
        </button>
      </div>

      <div className="rf-date-row">
        <span className="rf-date">{formatDateHe(date)}</span>
        <span className="rf-badge">
          <span className="rf-badge-dot">✓</span>
          תקן יומי 9 שעות
        </span>
      </div>

      <div className="rf-field">
        <label className="rf-label" htmlFor="entry-time">כניסה</label>
        <input
          id="entry-time"
          type="time"
          className="rf-input"
          value={entryTime}
          onChange={e => setEntryTime(e.target.value)}
        />
      </div>
      <div className="rf-field">
        <label className="rf-label" htmlFor="exit-time">יציאה</label>
        <input
          id="exit-time"
          type="time"
          className="rf-input"
          value={exitTime}
          onChange={e => setExitTime(e.target.value)}
        />
      </div>

      <h3 className="rf-section">דיווח פרויקטים</h3>

      {projects.map(p => (
        <div key={p.id} className="rf-project">
          <div className="rf-field">
            <label className="rf-label">פרויקט</label>
            <select
              className="rf-input rf-select"
              value={p.project}
              onChange={e => updateProject(p.id, 'project', e.target.value)}
            >
              <option value=""></option>
            </select>
          </div>
          <div className="rf-field">
            <label className="rf-label">משימה</label>
            <select
              className="rf-input rf-select"
              value={p.task}
              onChange={e => updateProject(p.id, 'task', e.target.value)}
            >
              <option value=""></option>
            </select>
          </div>
          <div className="rf-field">
            <label className="rf-label">מיקום</label>
            <select
              className="rf-input rf-select"
              value={p.location}
              onChange={e => updateProject(p.id, 'location', e.target.value)}
            >
              <option value=""></option>
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div className="rf-field">
            <label className="rf-label">שעת התחלה</label>
            <input
              type="time"
              className="rf-input"
              value={p.startTime}
              onChange={e => updateProject(p.id, 'startTime', e.target.value)}
            />
          </div>
          <div className="rf-field">
            <label className="rf-label">שעת סיום</label>
            <input
              type="time"
              className="rf-input"
              value={p.endTime}
              onChange={e => updateProject(p.id, 'endTime', e.target.value)}
            />
          </div>
          <input
            type="text"
            className="rf-notes"
            placeholder="הוספת פירוט..."
            value={p.notes}
            onChange={e => updateProject(p.id, 'notes', e.target.value)}
          />
          {projects.length > 1 && (
            <button className="rf-delete" onClick={() => removeProject(p.id)}>
              מחיקת פרויקט
            </button>
          )}
        </div>
      ))}

      <button className="rf-add" onClick={addProject}>
        הוספת פרויקט
        <span className="rf-plus">+</span>
      </button>

      <footer className="rf-footer">
        <div className="rf-progress-row">
          <span className="rf-progress-count">
            {formatHours(totalHours)} מתוך {DAILY_STANDARD} שעות
          </span>
          <span className="rf-progress-status">
            חסרות {formatHours(remaining)} שעות לדיווח
          </span>
        </div>
        <div className="rf-progress-bar">
          <div className="rf-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="rf-actions">
          <button className="rf-btn rf-btn-primary" onClick={handleSave}>שמירה</button>
          <button className="rf-btn rf-btn-secondary" onClick={onClose}>ביטול</button>
        </div>
      </footer>
    </div>
  )
}
