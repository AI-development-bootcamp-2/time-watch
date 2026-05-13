import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReportForm from './ReportForm.jsx'
import { apiFetch } from '../../api/client.js'
import { bumpTaskFrequency } from './useTaskAssignments.js'
import './ReportForm.css'

function toIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildWorkBody(payload) {
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
const ABSENCE_TYPE_MAP = {
  'חופשה': 'vacation',
  'מחלה': 'sick',
  'מילואים': 'military_reserve',
  'אחר': 'other',
}

function buildAbsenceBody(payload) {
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
  const [status, setStatus] = useState({ kind: 'idle' })

  // Auto-dismiss success banner after a few seconds
  useEffect(() => {
    if (status.kind !== 'success') return
    const t = setTimeout(() => setStatus({ kind: 'idle' }), 3500)
    return () => clearTimeout(t)
  }, [status])

  const handleSave = async payload => {
    setStatus({ kind: 'submitting' })
    try {
      if (payload.kind === 'work') {
        await apiFetch('/api/reports', {
          method: 'POST',
          body: JSON.stringify(buildWorkBody(payload)),
        })
        // Track per-task usage so "sort by frequency" in the cascading picker
        // has data to rank by.
        for (const project of payload.projects) {
          if (project.taskId != null) bumpTaskFrequency(project.taskId)
        }
      } else {
        await apiFetch('/api/absences', {
          method: 'POST',
          body: JSON.stringify(buildAbsenceBody(payload)),
        })
      }
      setStatus({ kind: 'success', message: 'הדיווח נשמר בהצלחה' })
    } catch (err) {
      if (err.status === 401) {
        // clearToken already fired in apiFetch; PrivateRoute will redirect on re-render
        navigate('/login', { replace: true })
        return
      }
      setStatus({ kind: 'error', message: err.message || 'שמירה נכשלה' })
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
