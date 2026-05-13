import { useState, useEffect, useMemo } from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getUsers } from '../../services/usersApi'
import { getUserTasks, assignTask, removeAssignment } from '../../services/userTasksApi'
import { request } from '../../services/apiClient'

// ── helpers ──────────────────────────────────────────────────────────────────

// Build a nested map: { clientName → { projectName → [task, …] } }
function groupTasksByClientProject(tasks) {
  const map = {}
  for (const t of tasks) {
    const client  = t.client_name  || 'ללא לקוח'
    const project = t.project_name || 'ללא פרויקט'
    if (!map[client]) map[client] = {}
    if (!map[client][project]) map[client][project] = []
    map[client][project].push(t)
  }
  return map
}

// Return true when two Sets contain identical values
function setsEqual(a, b) {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

// ── main component ────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const [mode, setMode]                       = useState('byEmployee')
  const [users, setUsers]                     = useState([])
  const [tasks, setTasks]                     = useState([])
  const [selectedId, setSelectedId]           = useState(null)
  const [assignments, setAssignments]         = useState(new Set())
  const [originalAssignments, setOriginalAssignments] = useState(new Set())
  const [loading, setLoading]                 = useState(true)
  const [saving, setSaving]                   = useState(false)
  const [loadError, setLoadError]             = useState('')
  const [saveError, setSaveError]             = useState('')
  const [saveSuccess, setSaveSuccess]         = useState(false)

  // Load all users (active only) and all tasks on mount
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      setLoadError('')
      try {
        const [allUsers, allTasks] = await Promise.all([
          getUsers(),
          request('GET', '/api/tasks'),
        ])
        setUsers(allUsers.filter(u => u.is_active))
        setTasks(allTasks)
      } catch {
        setLoadError('אירעה שגיאה בטעינת הנתונים. נסה לרענן.')
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [])

  // Reset selection when switching modes
  function handleModeChange(newMode) {
    setMode(newMode)
    setSelectedId(null)
    setAssignments(new Set())
    setOriginalAssignments(new Set())
    setSaveError('')
    setSaveSuccess(false)
  }

  // Select a user or task and fetch their current assignments
  async function handleSelect(id) {
    setSelectedId(id)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const rows = mode === 'byEmployee'
        ? await getUserTasks({ userId: id })
        : await getUserTasks({ taskId: id })
      const ids = new Set(
        mode === 'byEmployee'
          ? rows.map(r => r.task_id)
          : rows.map(r => r.user_id)
      )
      setAssignments(ids)
      setOriginalAssignments(new Set(ids))
    } catch {
      setSaveError('אירעה שגיאה בטעינת ההקצאות.')
    }
  }

  // Toggle a single checkbox item in the assignments Set
  function handleToggle(itemId) {
    setAssignments(prev => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  // Diff assignments vs original and call API for each change in parallel
  async function handleSave() {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const toAdd    = [...assignments].filter(id => !originalAssignments.has(id))
      const toRemove = [...originalAssignments].filter(id => !assignments.has(id))

      const addCalls = toAdd.map(id =>
        mode === 'byEmployee'
          ? assignTask({ userId: selectedId, taskId: id })
          : assignTask({ userId: id, taskId: selectedId })
      )
      const removeCalls = toRemove.map(id =>
        mode === 'byEmployee'
          ? removeAssignment({ userId: selectedId, taskId: id })
          : removeAssignment({ userId: id, taskId: selectedId })
      )

      await Promise.all([...addCalls, ...removeCalls])

      // Refresh from server and update snapshot
      const rows = mode === 'byEmployee'
        ? await getUserTasks({ userId: selectedId })
        : await getUserTasks({ taskId: selectedId })
      const ids = new Set(
        mode === 'byEmployee'
          ? rows.map(r => r.task_id)
          : rows.map(r => r.user_id)
      )
      setAssignments(ids)
      setOriginalAssignments(new Set(ids))
      setSaveSuccess(true)
    } catch {
      setSaveError('השמירה נכשלה. נסה שוב.')
    } finally {
      setSaving(false)
    }
  }

  // Grouped tasks map — memoised so it only rebuilds when tasks change
  const groupedTasks = useMemo(() => groupTasksByClientProject(tasks), [tasks])

  const hasChanges = !setsEqual(assignments, originalAssignments)

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner />

  if (loadError) return (
    <p role="alert" className="text-red-500 text-sm text-center py-6">{loadError}</p>
  )

  return (
    <div dir="rtl" className="space-y-4">

      {/* Mode toggle pills */}
      <div className="flex gap-2">
        {[
          { key: 'byEmployee', label: 'לפי עובד' },
          { key: 'byTask',     label: 'לפי משימה' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleModeChange(key)}
            className={[
              'rounded-full px-4 py-2 text-sm font-medium min-h-[36px] transition-colors',
              mode === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Two-panel layout — stacked on mobile, side-by-side on md+ */}
      <div className="flex flex-col md:flex-row gap-4">

        {/* Left panel — selection list */}
        <div className="md:w-64 flex-shrink-0 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              {mode === 'byEmployee' ? 'עובדים' : 'משימות'}
            </h2>
          </div>

          <ul className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
            {mode === 'byEmployee'
              ? users.map(u => (
                  <LeftItem
                    key={u.id}
                    id={u.id}
                    label={u.full_name}
                    selected={selectedId === u.id}
                    onSelect={handleSelect}
                  />
                ))
              : Object.entries(groupedTasks).map(([client, projects]) =>
                  Object.entries(projects).map(([project, taskList]) =>
                    taskList.map(t => (
                      <LeftItem
                        key={t.id}
                        id={t.id}
                        label={t.name}
                        subLabel={`${client} / ${project}`}
                        selected={selectedId === t.id}
                        onSelect={handleSelect}
                      />
                    ))
                  )
                )
            }
          </ul>
        </div>

        {/* Right panel — checklist */}
        <div className="flex-1 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {!selectedId ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              {mode === 'byEmployee' ? 'בחר עובד' : 'בחר משימה'}
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  {mode === 'byEmployee' ? 'משימות מוקצות' : 'עובדים מוקצים'}
                </h2>

                <div className="flex items-center gap-3">
                  {saveSuccess && (
                    <span className="text-green-600 text-sm">נשמר בהצלחה</span>
                  )}
                  {saveError && (
                    <span role="alert" className="text-red-500 text-sm">{saveError}</span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className={[
                      'rounded-full px-4 py-1.5 text-sm font-medium min-h-[32px] transition-colors',
                      hasChanges && !saving
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                    ].join(' ')}
                  >
                    {saving ? 'שומר…' : 'שמור'}
                  </button>
                </div>
              </div>

              {/* Checklist body */}
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
                {mode === 'byEmployee'
                  ? /* Tasks grouped by client → project */
                    Object.entries(groupedTasks).map(([client, projects]) => (
                      <div key={client}>
                        <p className="text-xs font-bold text-gray-500 mb-1">{client}</p>
                        {Object.entries(projects).map(([project, taskList]) => (
                          <div key={project} className="mb-3">
                            <p className="text-xs text-gray-400 mb-1 mr-2">{project}</p>
                            {taskList.map(t => (
                              <CheckRow
                                key={t.id}
                                id={t.id}
                                label={t.name}
                                checked={assignments.has(t.id)}
                                onToggle={handleToggle}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    ))
                  : /* Users flat list */
                    users.map(u => (
                      <CheckRow
                        key={u.id}
                        id={u.id}
                        label={u.full_name}
                        checked={assignments.has(u.id)}
                        onToggle={handleToggle}
                      />
                    ))
                }
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── sub-components ────────────────────────────────────────────────────────────

// Single row in the left selection list
function LeftItem({ id, label, subLabel, selected, onSelect }) {
  return (
    <li>
      <button
        onClick={() => onSelect(id)}
        className={[
          'w-full text-right px-4 py-3 text-sm transition-colors',
          selected
            ? 'bg-blue-50 border-r-2 border-blue-400 text-blue-700 font-medium'
            : 'text-gray-700 hover:bg-gray-50',
        ].join(' ')}
      >
        <span className="block">{label}</span>
        {subLabel && (
          <span className="block text-xs text-gray-400 mt-0.5">{subLabel}</span>
        )}
      </button>
    </li>
  )
}

// Single checkbox row in the right checklist panel
function CheckRow({ id, label, checked, onToggle }) {
  return (
    <label className="flex items-center gap-2 py-1.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(id)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 accent-blue-600 cursor-pointer"
      />
      <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  )
}
