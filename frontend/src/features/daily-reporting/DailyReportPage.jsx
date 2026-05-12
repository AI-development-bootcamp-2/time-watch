import { useEffect, useState } from 'react'
import ReportForm from './ReportForm.jsx'
import { apiFetch } from '../../api/client.js'
import { useAuth } from '../../hooks/useAuth'
import { toIsoDate } from '../../utils/date.js'
import './ReportForm.css'

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

function buildAbsenceBody(payload) {
  return {
    type:          payload.type,
    start_date:    payload.startDate,
    end_date:      payload.endDate,
    is_partial:    payload.partialDay ?? false,
    partial_hours: payload.partialHours ?? null,
    notes:         payload.notes ?? null,
  }
}

export default function DailyReportPage() {
  const { logout } = useAuth()
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
      } else {
        await apiFetch('/api/absences', {
          method: 'POST',
          body: JSON.stringify(buildAbsenceBody(payload)),
        })
      }
      setStatus({ kind: 'success', message: 'הדיווח נשמר בהצלחה' })
    } catch (err) {
      if (err.status === 401) {
        await logout() // clears AuthContext user → ProtectedRoute redirects to /login
        return
      }
      setStatus({ kind: 'error', message: err.message || 'שמירה נכשלה' })
    }
  }

  const handleClose = () => {
    // No-op until a dashboard route exists — wire to navigate('/dashboard') then.
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
