import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReportForm from './ReportForm'
import { apiFetch, ApiError } from '../../api/client'
import './ReportForm.css'

interface ProjectEntry {
  project: unknown
  task: unknown
  location: unknown
  startTime: unknown
  endTime: unknown
  notes?: unknown
}

interface WorkPayload {
  kind: 'work'
  date: Date
  entryTime: unknown
  exitTime: unknown
  projects: ProjectEntry[]
}

interface AbsencePayload {
  kind: 'absence'
  type: string
  startDate: string
  endDate: string
  partialDay?: unknown
  notes?: string
}

type SavePayload = WorkPayload | AbsencePayload

// Convert a Date object to an ISO date string (YYYY-MM-DD)
function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildWorkBody(payload: WorkPayload) {
  const { date, entryTime, exitTime, projects } = payload
  return {
    date: toIsoDate(date),
    entryTime,
    exitTime,
    entries: projects.map(p => ({
      project: p.project,
      task: p.task,
      location: p.location,
      startTime: p.startTime,
      endTime: p.endTime,
      notes: p.notes,
    })),
  }
}

// Map the Hebrew labels the form uses to the enum values absences.js expects.
const ABSENCE_TYPE_MAP: Record<string, string> = {
  'חופשה': 'vacation',
  'מחלה': 'sick',
  'מילואים': 'military_reserve',
  'אחר': 'other',
}

function buildAbsenceBody(payload: AbsencePayload) {
  return {
    type: ABSENCE_TYPE_MAP[payload.type] || payload.type,
    start_date: payload.startDate,
    end_date: payload.endDate,
    is_partial: Boolean(payload.partialDay),
    notes: payload.notes || null,
  }
}

export default function DailyReportPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<{ kind: string; message?: string }>({ kind: 'idle' })

  // Auto-dismiss success banner after a few seconds
  useEffect(() => {
    if (status.kind !== 'success') return
    const t = setTimeout(() => setStatus({ kind: 'idle' }), 3500)
    return () => clearTimeout(t)
  }, [status])

  const handleSave = async (payload: SavePayload) => {
    setStatus({ kind: 'submitting' })
    try {
      if (payload.kind === 'work') {
        await apiFetch('/api/reports', {
          method: 'POST',
          body: JSON.stringify(buildWorkBody(payload)),
        })
      } else {
        await apiFetch('/api/absences', {
          method: 'POST',
          body: JSON.stringify(buildAbsenceBody(payload)),
        })
      }
      setStatus({ kind: 'success', message: 'הדיווח נשמר בהצלחה' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // clearToken already fired in apiFetch; PrivateRoute will redirect on re-render
        navigate('/login', { replace: true })
        return
      }
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'שמירה נכשלה' })
    }
  }

  const handleClose = () => {
    // No upstream page yet; '/' redirects right back here, so this is a no-op
    // until a dashboard exists. Wire to navigate('/dashboard') once available.
    navigate('/')
  }

  return (
    <div className="daily-report-page">
      {status.kind === 'error' && (
        <div className="page-banner error" role="alert">{status.message}</div>
      )}
      {status.kind === 'success' && (
        <div className="page-banner success" role="status">{status.message}</div>
      )}
      <ReportForm
        onSave={handleSave}
        onClose={handleClose}
        isSubmitting={status.kind === 'submitting'}
      />
    </div>
  )
}
