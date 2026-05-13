import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '../../api/client.js'

// Mock data used if the API endpoint isn't available yet — keeps the form
// working in dev. Mirrors the rows seeded by `backend/seeds/03_dev_employee.cjs`.
const MOCK_ASSIGNMENTS = [
  { taskId: 1, taskName: 'UX UI Design', projectId: 1, projectName: 'Dev Project', clientId: 1, clientName: 'Dev Client' },
  { taskId: 2, taskName: 'Front-end',    projectId: 1, projectName: 'Dev Project', clientId: 1, clientName: 'Dev Client' },
  { taskId: 3, taskName: 'Back-end',     projectId: 1, projectName: 'Dev Project', clientId: 1, clientName: 'Dev Client' },
  { taskId: 4, taskName: 'QA',           projectId: 1, projectName: 'Dev Project', clientId: 1, clientName: 'Dev Client' },
]

const FREQ_KEY = 'time_watch_task_frequencies'

function readFrequencies() {
  try {
    const raw = localStorage.getItem(FREQ_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeFrequencies(map) {
  try {
    localStorage.setItem(FREQ_KEY, JSON.stringify(map))
  } catch {
    // ignore storage errors
  }
}

export function bumpTaskFrequency(taskId) {
  if (taskId == null) return
  const map = readFrequencies()
  map[taskId] = (map[taskId] || 0) + 1
  writeFrequencies(map)
}

/**
 * Fetches the authenticated user's task assignments and exposes a frequency
 * counter persisted to localStorage. Tries `/api/users/me/tasks` first and
 * falls back to mock data if the endpoint isn't implemented yet — so the
 * cascading dropdowns always have something to show in dev.
 */
export function useTaskAssignments() {
  const [assignments, setAssignments] = useState([])
  const [frequencies, setFrequencies] = useState(readFrequencies)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/users/me/tasks')
      if (Array.isArray(data) && data.length > 0) {
        setAssignments(normalize(data))
      } else {
        setAssignments(MOCK_ASSIGNMENTS)
      }
    } catch (err) {
      // Endpoint may not exist yet — fall back to mock data and surface the
      // error in case the caller wants to display it.
      setAssignments(MOCK_ASSIGNMENTS)
      setError(err)
    } finally {
      setLoading(false)
      setFrequencies(readFrequencies())
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { assignments, frequencies, loading, error, refresh }
}

// Accept a few likely shapes the backend might return.
function normalize(rows) {
  return rows
    .map(r => ({
      taskId:      r.taskId      ?? r.task_id      ?? r.id,
      taskName:    r.taskName    ?? r.task_name    ?? r.name,
      projectId:   r.projectId   ?? r.project_id   ?? r.project?.id,
      projectName: r.projectName ?? r.project_name ?? r.project?.name,
      clientId:    r.clientId    ?? r.client_id    ?? r.client?.id    ?? r.project?.clientId    ?? r.project?.client_id,
      clientName:  r.clientName  ?? r.client_name  ?? r.client?.name  ?? r.project?.clientName  ?? r.project?.client_name,
    }))
    .filter(r => r.taskId != null && r.projectId != null && r.clientId != null)
}
