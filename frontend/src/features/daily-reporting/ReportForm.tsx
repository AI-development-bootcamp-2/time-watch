import { useMemo, useState } from 'react'
import './ReportForm.css'
import ProjectPicker from './ProjectPicker'

const DAILY_STANDARD = 9
const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const LOCATIONS = ['משרד', 'לקוח', 'בית']
const TASKS = ['UX UI Design', 'Front-end', 'Back-end', 'QA']
const ABSENCE_TYPES = ['חופשה', 'מחלה', 'מילואים', 'אחר']
const ABSENCE_REQUIRES_DOC = new Set(['מחלה', 'מילואים'])

interface ProjectRow {
  id: number
  project: string
  task: string
  location: string
  startTime: string
  endTime: string
  notes: string
}

interface ProjectErrors {
  project?: string
  task?: string
  location?: string
  endTime?: string
}

interface WorkErrors {
  exitTime?: string
  projects: Record<number, ProjectErrors>
}

interface WorkPayload {
  kind: 'work'
  date: Date
  entryTime: string
  exitTime: string
  projects: ProjectRow[]
}

interface AbsencePayload {
  kind: 'absence'
  type: string
  startDate: string
  endDate: string
  partialDay: boolean
  notes: string
  documentName: string
}

type SavePayload = WorkPayload | AbsencePayload

interface ReportFormProps {
  onClose?: () => void
  onSave?: (payload: SavePayload) => void
  date?: Date
  isSubmitting?: boolean
}

// Format a Date as "יום X׳ dd/mm/yy" in Hebrew
function formatDateHe(date: Date): string {
  const day = DAYS_HE[date.getDay()]
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `יום ${day}׳ ${dd}/${mm}/${yy}`
}

// Format a Date as YYYY-MM-DD for date inputs
function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Parse "HH:MM" string to fractional hours, returning null on empty/invalid
function parseTime(t: string): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h + (Number.isNaN(m) ? 0 : m) / 60
}

// Hours difference between two "HH:MM" strings, clamped at 0
function hoursBetween(start: string, end: string): number {
  const s = parseTime(start)
  const e = parseTime(end)
  if (s === null || e === null) return 0
  return Math.max(0, e - s)
}

// Build a fresh ProjectRow with a unique id and optional overrides
function newProject(defaults: Partial<ProjectRow> = {}): ProjectRow {
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

export default function ReportForm({ onClose, onSave, date = new Date(), isSubmitting = false }: ReportFormProps) {
  const [activeTab, setActiveTab] = useState('work')

  // --- Work-tab state ---
  const [entryTime, setEntryTime] = useState('09:00')
  const [exitTime, setExitTime] = useState('18:00')
  const [projects, setProjects] = useState<ProjectRow[]>([
    newProject({ startTime: '09:00', endTime: '18:00' }),
  ])
  // When non-null, render the project picker for this row id instead of the form
  const [pickerForProjectId, setPickerForProjectId] = useState<number | null>(null)

  // --- Absence-tab state ---
  const [absenceType, setAbsenceType] = useState('')
  const [absenceStart, setAbsenceStart] = useState(toIsoDate(date))
  const [absenceEnd, setAbsenceEnd] = useState(toIsoDate(date))
  const [absencePartial, setAbsencePartial] = useState(false)
  const [absenceNotes, setAbsenceNotes] = useState('')
  const [absenceDocName, setAbsenceDocName] = useState('')

  // --- Validation errors ---
  // Shape: { exitTime?: string, projects: { [id]: { project?, task?, location?, endTime? } } }
  const [errors, setErrors] = useState<WorkErrors>({ projects: {} })

  const totalHours = useMemo(
    () => projects.reduce((sum, p) => sum + hoursBetween(p.startTime, p.endTime), 0),
    [projects]
  )
  const remaining = Math.max(0, DAILY_STANDARD - totalHours)
  const progressPct = Math.min(100, (totalHours / DAILY_STANDARD) * 100)

  // Update a single field on the given project row
  const updateProject = (id: number, field: keyof ProjectRow, value: string) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)))
  }
  // Append a new empty project row
  const addProject = () => setProjects(prev => [...prev, newProject()])
  // Remove the project row with the given id
  const removeProject = (id: number) => setProjects(prev => prev.filter(p => p.id !== id))

  // Build a WorkErrors object reflecting all current validation problems
  const validateWork = (): WorkErrors => {
    const errs: WorkErrors = { projects: {} }

    const entryMin = parseTime(entryTime)
    const exitMin = parseTime(exitTime)
    if (entryMin !== null && exitMin !== null && exitMin <= entryMin) {
      errs.exitTime = 'שעת היציאה חייבת להיות אחרי שעת הכניסה'
    }

    projects.forEach(p => {
      const pErrs: ProjectErrors = {}
      if (!p.project) pErrs.project = 'נדרש לבחור פרויקט'
      if (!p.task) pErrs.task = 'נדרש לבחור משימה'
      if (!p.location) pErrs.location = 'נדרש לבחור מיקום'

      const s = parseTime(p.startTime)
      const e = parseTime(p.endTime)
      if (s !== null && e !== null && e <= s) {
        pErrs.endTime = 'שעת הסיום חייבת להיות אחרי שעת ההתחלה'
      }

      if (Object.keys(pErrs).length > 0) errs.projects[p.id] = pErrs
    })

    return errs
  }

  // True when any validation error is present
  const workHasErrors = (errs: WorkErrors): boolean =>
    Boolean(errs.exitTime) || Object.keys(errs.projects).length > 0

  const handleSave = () => {
    if (activeTab === 'work') {
      const errs = validateWork()
      if (workHasErrors(errs)) {
        setErrors(errs)
        return
      }
      setErrors({ projects: {} })
    }

    const payload: SavePayload =
      activeTab === 'work'
        ? { kind: 'work', date, entryTime, exitTime, projects }
        : {
            kind: 'absence',
            type: absenceType,
            startDate: absenceStart,
            endDate: absenceEnd,
            partialDay: absencePartial,
            notes: absenceNotes,
            documentName: absenceDocName,
          }
    if (onSave) onSave(payload)
    else console.log('Save report', payload)
  }

  // Render hours as integer when whole, otherwise one decimal
  const formatHours = (h: number): number | string => (Number.isInteger(h) ? h : h.toFixed(1))

  // Picker view replaces the form view while open (form state is preserved
  // because this component remains mounted)
  if (pickerForProjectId !== null) {
    const current = projects.find(p => p.id === pickerForProjectId)
    return (
      <ProjectPicker
        selected={current?.project}
        onSelect={value => {
          updateProject(pickerForProjectId, 'project', value)
          setPickerForProjectId(null)
        }}
        onClose={() => setPickerForProjectId(null)}
      />
    )
  }

  const isWork = activeTab === 'work'
  const docRequired = ABSENCE_REQUIRES_DOC.has(absenceType)

  return (
    <div className="report-form" dir="rtl">
      <header className="rf-header">
        <h2 className="rf-title">דיווח ידני</h2>
        <button className="rf-close" onClick={onClose} aria-label="סגור">×</button>
      </header>

      <div className="rf-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={isWork}
          className={isWork ? 'rf-tab active' : 'rf-tab'}
          onClick={() => setActiveTab('work')}
        >
          דיווח עבודה
        </button>
        <button
          role="tab"
          aria-selected={!isWork}
          className={!isWork ? 'rf-tab active' : 'rf-tab'}
          onClick={() => setActiveTab('absence')}
        >
          דיווח העדרות
        </button>
      </div>

      {isWork ? (
        <>
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
          <div className={errors.exitTime ? 'rf-field has-error' : 'rf-field'}>
            <label className="rf-label" htmlFor="exit-time">יציאה</label>
            <input
              id="exit-time"
              type="time"
              className="rf-input"
              value={exitTime}
              onChange={e => setExitTime(e.target.value)}
            />
          </div>
          {errors.exitTime && <div className="rf-error">{errors.exitTime}</div>}

          <h3 className="rf-section">דיווח פרויקטים</h3>

          {projects.map(p => {
            const pErrs = errors.projects[p.id] || {}
            return (
              <div key={p.id} className="rf-project">
                <button
                  type="button"
                  className={pErrs.project ? 'rf-field-button has-error' : 'rf-field-button'}
                  onClick={() => setPickerForProjectId(p.id)}
                >
                  <span className="rf-label">פרויקט</span>
                  <span className={p.project ? 'rf-field-value' : 'rf-field-value placeholder'}>
                    {p.project || ''}
                    <span className="rf-field-chevron"> ⌄</span>
                  </span>
                </button>
                {pErrs.project && <div className="rf-error">{pErrs.project}</div>}

                <div className={pErrs.task ? 'rf-field has-error' : 'rf-field'}>
                  <label className="rf-label">משימה</label>
                  <select
                    className="rf-input rf-select"
                    value={p.task}
                    onChange={e => updateProject(p.id, 'task', e.target.value)}
                  >
                    <option value=""></option>
                    {TASKS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                {pErrs.task && <div className="rf-error">{pErrs.task}</div>}

                <div className={pErrs.location ? 'rf-field has-error' : 'rf-field'}>
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
                {pErrs.location && <div className="rf-error">{pErrs.location}</div>}

                <div className="rf-field">
                  <label className="rf-label">שעת התחלה</label>
                  <input
                    type="time"
                    className="rf-input"
                    value={p.startTime}
                    onChange={e => updateProject(p.id, 'startTime', e.target.value)}
                  />
                </div>
                <div className={pErrs.endTime ? 'rf-field has-error' : 'rf-field'}>
                  <label className="rf-label">שעת סיום</label>
                  <input
                    type="time"
                    className="rf-input"
                    value={p.endTime}
                    onChange={e => updateProject(p.id, 'endTime', e.target.value)}
                  />
                </div>
                {pErrs.endTime && <div className="rf-error">{pErrs.endTime}</div>}

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
            )
          })}

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
              <button
                className="rf-btn rf-btn-primary"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'שומר...' : 'שמירה'}
              </button>
              <button
                className="rf-btn rf-btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                ביטול
              </button>
            </div>
          </footer>
        </>
      ) : (
        <>
          <div className="rf-field">
            <label className="rf-label" htmlFor="absence-type">סוג היעדרות</label>
            <select
              id="absence-type"
              className="rf-input rf-select"
              value={absenceType}
              onChange={e => setAbsenceType(e.target.value)}
            >
              <option value=""></option>
              {ABSENCE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="rf-field">
            <label className="rf-label" htmlFor="absence-start">תאריך התחלה</label>
            <input
              id="absence-start"
              type="date"
              className="rf-input"
              value={absenceStart}
              onChange={e => setAbsenceStart(e.target.value)}
            />
          </div>
          <div className="rf-field">
            <label className="rf-label" htmlFor="absence-end">תאריך סיום</label>
            <input
              id="absence-end"
              type="date"
              className="rf-input"
              value={absenceEnd}
              onChange={e => setAbsenceEnd(e.target.value)}
            />
          </div>

          <div className="rf-field">
            <label className="rf-label" htmlFor="absence-partial">היעדרות חלקית</label>
            <input
              id="absence-partial"
              type="checkbox"
              className="rf-input"
              checked={absencePartial}
              onChange={e => setAbsencePartial(e.target.checked)}
            />
          </div>

          <div className="rf-field rf-field-upload">
            <label className="rf-label">
              מסמך מצורף{docRequired ? ' *' : ''}
            </label>
            <label className="rf-upload-btn">
              <input
                type="file"
                onChange={e => setAbsenceDocName(e.target.files?.[0]?.name || '')}
                hidden
              />
              {absenceDocName || 'בחירת קובץ'}
            </label>
          </div>

          <input
            type="text"
            className="rf-notes"
            placeholder="הערות..."
            value={absenceNotes}
            onChange={e => setAbsenceNotes(e.target.value)}
          />

          {docRequired && !absenceDocName && (
            <div className="rf-warning">
              נדרש מסמך מצורף עבור {absenceType}
            </div>
          )}

          <footer className="rf-footer">
            <div className="rf-actions">
              <button
                className="rf-btn rf-btn-primary"
                onClick={handleSave}
                disabled={isSubmitting || !absenceType || (docRequired && !absenceDocName)}
              >
                {isSubmitting ? 'שומר...' : 'שמירה'}
              </button>
              <button
                className="rf-btn rf-btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                ביטול
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  )
}
