import { useEffect, useMemo, useState } from 'react'
import '../absences/AbsenceForm.css'
import './ReportForm.css'
import { apiFetch } from '../../api/client'
import ProjectPicker, { type ClientGroup } from './ProjectPicker'
import ScrollTimePicker from './ScrollTimePicker'

const DAILY_STANDARD = 9
const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const LOCATIONS = ['משרד', 'לקוח', 'בית']

type ProjectRow = {
  id: number
  project: string
  task: string
  taskId: number | null
  location: string
  startTime: string
  endTime: string
  notes: string
}

type ProjectErrors = Partial<Record<'project' | 'task' | 'location' | 'endTime', string>>

type WorkErrors = {
  exitTime?: string
  projects: Record<number, ProjectErrors>
}

export type WorkPayload = {
  kind: 'work'
  date: Date
  entryTime: string
  exitTime: string
  projects: ProjectRow[]
}

type ReportFormProps = {
  onClose?: () => void
  onSave?: (payload: WorkPayload) => Promise<void> | void
  onSwitchToAbsence?: () => void
  date?: Date
  isSubmitting?: boolean
  initialEntryTime?: string
  initialExitTime?: string
}

type AssignedTaskRow = {
  task_id: number
  task_name: string
  project_id: number
  project_name: string
  client_id: number
  client_name: string
}

function formatDateHe(date: Date) {
  const day = DAYS_HE[date.getDay()]
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `יום ${day}׳ ${dd}/${mm}/${yy}`
}

function parseTime(t: string) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h + (Number.isNaN(m) ? 0 : m) / 60
}

function hoursBetween(start: string, end: string) {
  const s = parseTime(start)
  const e = parseTime(end)
  if (s === null || e === null) return 0
  return Math.max(0, e - s)
}

function newProject(defaults: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: Date.now() + Math.random(),
    project: '',
    task: '',
    taskId: null,
    location: '',
    startTime: '',
    endTime: '',
    notes: '',
    ...defaults,
  }
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildTaskGroups(rows: AssignedTaskRow[]): ClientGroup[] {
  const clients = new Map<number, ClientGroup>()

  rows.forEach(row => {
    let clientGroup = clients.get(row.client_id)
    if (!clientGroup) {
      clientGroup = { client: row.client_name, clientId: row.client_id, projects: [] }
      clients.set(row.client_id, clientGroup)
    }

    let projectNode = clientGroup.projects.find(project => project.id === row.project_id)
    if (!projectNode) {
      projectNode = { id: row.project_id, name: row.project_name, tasks: [] }
      clientGroup.projects.push(projectNode)
    }

    projectNode.tasks.push({ id: row.task_id, name: row.task_name })
  })

  return Array.from(clients.values())
}

export default function ReportForm({ onClose, onSave, onSwitchToAbsence, date = new Date(), isSubmitting = false, initialEntryTime, initialExitTime }: ReportFormProps) {
  const [entryTime, setEntryTime] = useState(initialEntryTime ?? '09:00')
  const [exitTime, setExitTime] = useState(initialExitTime ?? '')
  const [workLocation, setWorkLocation] = useState(LOCATIONS[0])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [pickerForProjectId, setPickerForProjectId] = useState<number | null>(null)
  const [errors, setErrors] = useState<WorkErrors>({ projects: {} })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [taskGroups, setTaskGroups] = useState<ClientGroup[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadTasks() {
      setTasksLoading(true)
      setTasksError(null)
      try {
        const rows = await apiFetch('/api/tasks/mine') as AssignedTaskRow[]
        if (!cancelled) setTaskGroups(buildTaskGroups(rows))
      } catch (err: unknown) {
        if (!cancelled) {
          setTasksError(err instanceof Error ? err.message : 'טעינת המשימות נכשלה')
        }
      } finally {
        if (!cancelled) setTasksLoading(false)
      }
    }

    loadTasks()

    return () => {
      cancelled = true
    }
  }, [])

  const totalHours = useMemo(
    () => projects.reduce((sum, p) => sum + hoursBetween(p.startTime, p.endTime), 0),
    [projects]
  )
  const remaining = Math.max(0, DAILY_STANDARD - totalHours)
  const progressPct = Math.min(100, (totalHours / DAILY_STANDARD) * 100)

  const updateProject = (id: number, updates: Partial<Omit<ProjectRow, 'id'>>) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
  }
  const addProject = () => setProjects(prev => [
    ...prev,
    newProject({ location: workLocation, startTime: entryTime, endTime: exitTime }),
  ])
  const removeProject = (id: number) => setProjects(prev => prev.filter(p => p.id !== id))

  const validateWork = (): WorkErrors => {
    const errs: WorkErrors = { projects: {} }
    const entryMin = parseTime(entryTime)
    const exitMin = parseTime(exitTime)
    if (entryMin !== null && exitMin !== null && exitMin <= entryMin) {
      errs.exitTime = 'שעת היציאה חייבת להיות אחרי שעת הכניסה'
    }
    if (projects.length === 0) {
      errs.exitTime = errs.exitTime ?? 'יש להוסיף לפחות פרויקט אחד'
    }
    projects.forEach(p => {
      const pErrs: ProjectErrors = {}
      if (p.taskId === null) pErrs.task = 'נדרש לבחור משימה'
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

  const workHasErrors = (errs: WorkErrors) =>
    Boolean(errs.exitTime) || Object.keys(errs.projects).length > 0

  const handleSave = async () => {
    const errs = validateWork()
    if (workHasErrors(errs)) {
      setErrors(errs)
      return
    }
    setErrors({ projects: {} })
    setSaveError(null)
    setSaving(true)
    try {
      const payload: WorkPayload = { kind: 'work', date, entryTime, exitTime, projects }
      await apiFetch('/api/work-entries', {
        method: 'POST',
        body: JSON.stringify({
          date: formatLocalDate(date),
          entries: projects.map(p => ({
            start_time: p.startTime,
            end_time: p.endTime,
            location: p.location,
            task_id: p.taskId,
            description: p.notes || null,
          })),
        }),
      })
      if (onSave) await onSave(payload)
      onClose?.()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'שמירת הדיווח נכשלה')
    } finally {
      setSaving(false)
    }
  }

  const formatHours = (h: number) => (Number.isInteger(h) ? h : h.toFixed(1))
  const isBusy = saving || isSubmitting || tasksLoading

  return (
    <>
    {pickerForProjectId !== null && (
      <ProjectPicker
        groups={taskGroups}
        selected={projects.find(p => p.id === pickerForProjectId)?.taskId ?? null}
        onSelect={(taskId: number, taskName: string, projectName: string) => {
          updateProject(pickerForProjectId, { task: taskName, taskId, project: projectName })
          setPickerForProjectId(null)
        }}
        onClose={() => setPickerForProjectId(null)}
        onBack={() => setPickerForProjectId(null)}
      />
    )}
    <div className="af-overlay" role="dialog" aria-modal="true" aria-label="דיווח עבודה"
      onClick={e => { if (e.target === e.currentTarget) onClose?.() }}
      dir="rtl"
    >
      <div className="af-sheet">
        <div className="af-handle" aria-hidden="true" />

        <div className="af-scroll">
          <div className="af-header">
            <h2 className="af-title">דיווח עבודה</h2>
            <button type="button" className="af-close-btn" aria-label="סגור" onClick={onClose}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="af-segmented" role="tablist" aria-label="בחירת סוג דיווח">
            <button type="button" className="af-seg-option af-seg-option--active" role="tab" aria-selected="true">
              דיווח עבודה
            </button>
            <button type="button" className="af-seg-option af-seg-option--inactive" role="tab" aria-selected="false" onClick={onSwitchToAbsence}>
              דיווח היעדרות
            </button>
          </div>

          {saveError && (
            <p className="af-error-msg af-error-msg--form" role="alert">{saveError}</p>
          )}
          {tasksError && (
            <p className="af-error-msg af-error-msg--form" role="alert">{tasksError}</p>
          )}

          <div className="rf-day-summary">
            <span className="rf-standard-badge">
              <span className="rf-badge-dot" aria-hidden="true" />
              תקן יומי 9 שעות
            </span>
            <span className="rf-date-value">{formatDateHe(date)}</span>
          </div>

          <div className="af-card">
            <div className={`af-card-row${errors.exitTime ? ' rf-row-error' : ''}`}>
              <span className="af-row-tag">כניסה</span>
              <ScrollTimePicker value={entryTime} onChange={setEntryTime} label="שעת כניסה" />
            </div>
            <div className={`af-card-row${errors.exitTime ? ' rf-row-error' : ''}`}>
              <span className="af-row-tag">יציאה</span>
              <ScrollTimePicker value={exitTime} onChange={setExitTime} label="שעת יציאה" />
            </div>
            <div className="af-card-row rf-location-row">
              <span className="af-row-tag">מיקום</span>
              <select
                className="rf-location-select"
                value={workLocation}
                onChange={e => setWorkLocation(e.target.value)}
              >
                {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              <span className="af-chevron" aria-hidden="true">›</span>
            </div>
          </div>
          {errors.exitTime && <p className="af-error-msg" role="alert">{errors.exitTime}</p>}

          {projects.length > 0 && (
            <div className="rf-section-label">דיווח פרויקטים</div>
          )}

          {projects.map(p => {
            const pErrs = errors.projects[p.id] || {}
            return (
              <div key={p.id} className="af-card rf-project-card">
                <button
                  type="button"
                  className="af-card-row af-card-row-button"
                  onClick={() => setPickerForProjectId(p.id)}
                >
                  <span className="af-row-tag">פרויקט</span>
                  <span className={p.project ? 'af-row-title' : 'af-row-title rf-placeholder'}>
                    {p.project || 'לא נבחר'}
                  </span>
                  <span className="af-chevron" aria-hidden="true">›</span>
                </button>

                <button
                  type="button"
                  className={`af-card-row af-card-row-button${pErrs.task ? ' rf-row-error' : ''}`}
                  onClick={() => setPickerForProjectId(p.id)}
                >
                  <span className="af-row-tag">משימה</span>
                  <span className={p.task ? 'af-row-title' : 'af-row-title rf-placeholder'}>
                    {p.task || 'בחר משימה'}
                  </span>
                  <span className="af-chevron" aria-hidden="true">›</span>
                </button>
                {pErrs.task && <p className="af-error-msg">{pErrs.task}</p>}

                <div className={`af-card-row${pErrs.location ? ' rf-row-error' : ''}`}>
                  <span className="af-row-tag">מיקום</span>
                  <select
                    className="rf-select"
                    value={p.location}
                    onChange={e => updateProject(p.id, { location: e.target.value })}
                  >
                    <option value="">בחר מיקום</option>
                    {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
                {pErrs.location && <p className="af-error-msg">{pErrs.location}</p>}

                <div className="af-card-row">
                  <span className="af-row-tag">שעת התחלה</span>
                  <ScrollTimePicker
                    value={p.startTime}
                    onChange={v => updateProject(p.id, { startTime: v })}
                    label="שעת התחלה"
                  />
                </div>
                <div className={`af-card-row${pErrs.endTime ? ' rf-row-error' : ''}`}>
                  <span className="af-row-tag">שעת סיום</span>
                  <ScrollTimePicker
                    value={p.endTime}
                    onChange={v => updateProject(p.id, { endTime: v })}
                    label="שעת סיום"
                  />
                </div>
                {pErrs.endTime && <p className="af-error-msg">{pErrs.endTime}</p>}

                <div className="af-card-row">
                  <input
                    type="text"
                    className="rf-notes-input"
                    placeholder="הוספת פירוט..."
                    value={p.notes}
                    onChange={e => updateProject(p.id, { notes: e.target.value })}
                  />
                </div>

                <button type="button" className="rf-delete-btn" onClick={() => removeProject(p.id)}>
                  מחיקת פרויקט
                </button>
              </div>
            )
          })}

          <button type="button" className="rf-add-btn" onClick={addProject}>
            הוספת פרויקט
            <span className="rf-plus-circle">+</span>
          </button>

          {projects.length > 0 && (
          <div className="rf-progress-wrap">
            <div className="rf-progress-row">
              <span className="rf-progress-count">{formatHours(totalHours)} מתוך {DAILY_STANDARD} שעות</span>
              <span className="rf-progress-status">חסרות {formatHours(remaining)} שעות לדיווח</span>
            </div>
            <div className="rf-progress-bar">
              <div className="rf-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          )}
        </div>

        <footer className="af-footer">
          <button
            type="button"
            className="af-btn-primary"
            onClick={handleSave}
            disabled={isBusy}
          >
            {tasksLoading ? 'טוען משימות...' : saving || isSubmitting ? 'שומר...' : 'שמירה'}
          </button>
          <button
            type="button"
            className="af-btn-secondary"
            onClick={onClose}
            disabled={isBusy}
          >
            ביטול
          </button>
        </footer>
      </div>
    </div>
    </>
  )
}
