import { useMemo, useEffect } from 'react'

/**
 * Three cascading dropdowns: לקוח → פרויקט → משימה.
 *
 * - The available options at each level are filtered by the parent selection
 *   and the user's task assignments (passed in via `assignments`).
 * - If a level has exactly one option after filtering, it is auto-selected.
 * - Sort order toggles between alphabetical (default) and reporting frequency.
 *
 * Controlled component: parent owns { clientId, projectId, taskId, sortBy } in
 * the row's state and receives updates via `onChange`.
 */
export default function CascadingTaskFields({
  assignments,
  selection,
  onChange,
  frequencies = {},
  errors = {},
  sortBy = 'alpha',
}) {
  const { clientId, projectId, taskId } = selection

  // --- options at each level, filtered by parent selection ---------
  const clients = useMemo(() => {
    const seen = new Map()
    for (const a of assignments) {
      if (!seen.has(a.clientId)) seen.set(a.clientId, { id: a.clientId, name: a.clientName })
    }
    return sortOptions([...seen.values()], sortBy, frequencies, assignments, 'client')
  }, [assignments, sortBy, frequencies])

  const projects = useMemo(() => {
    if (clientId == null) return []
    const seen = new Map()
    for (const a of assignments) {
      if (a.clientId !== clientId) continue
      if (!seen.has(a.projectId)) seen.set(a.projectId, { id: a.projectId, name: a.projectName })
    }
    return sortOptions([...seen.values()], sortBy, frequencies, assignments, 'project')
  }, [assignments, clientId, sortBy, frequencies])

  const tasks = useMemo(() => {
    if (clientId == null || projectId == null) return []
    return sortOptions(
      assignments
        .filter(a => a.clientId === clientId && a.projectId === projectId)
        .map(a => ({ id: a.taskId, name: a.taskName })),
      sortBy,
      frequencies,
      assignments,
      'task'
    )
  }, [assignments, clientId, projectId, sortBy, frequencies])

  // --- auto-select single option on cascade ------------------------
  useEffect(() => {
    if (clientId == null && clients.length === 1) {
      onChange({ ...selection, clientId: clients[0].id, projectId: null, taskId: null })
    }
  }, [clients, clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (clientId != null && projectId == null && projects.length === 1) {
      onChange({ ...selection, projectId: projects[0].id, taskId: null })
    }
  }, [projects, projectId, clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (projectId != null && taskId == null && tasks.length === 1) {
      onChange({ ...selection, taskId: tasks[0].id })
    }
  }, [tasks, taskId, projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- handlers: changing a parent clears children -----------------
  const setClient = id =>
    onChange({ ...selection, clientId: id || null, projectId: null, taskId: null })
  const setProject = id =>
    onChange({ ...selection, projectId: id || null, taskId: null })
  const setTask = id =>
    onChange({ ...selection, taskId: id || null })

  return (
    <>
      <div className={errors.clientId ? 'rf-field has-error' : 'rf-field'}>
        <label className="rf-label">לקוח</label>
        <select
          className="rf-input rf-select"
          value={clientId ?? ''}
          onChange={e => setClient(e.target.value ? Number(e.target.value) : null)}
        >
          <option value=""></option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {errors.clientId && <div className="rf-error">{errors.clientId}</div>}

      <div className={errors.projectId ? 'rf-field has-error' : 'rf-field'}>
        <label className="rf-label">פרויקט</label>
        <select
          className="rf-input rf-select"
          value={projectId ?? ''}
          onChange={e => setProject(e.target.value ? Number(e.target.value) : null)}
          disabled={clientId == null}
        >
          <option value=""></option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {errors.projectId && <div className="rf-error">{errors.projectId}</div>}

      <div className={errors.taskId ? 'rf-field has-error' : 'rf-field'}>
        <label className="rf-label">משימה</label>
        <select
          className="rf-input rf-select"
          value={taskId ?? ''}
          onChange={e => setTask(e.target.value ? Number(e.target.value) : null)}
          disabled={projectId == null}
        >
          <option value=""></option>
          {tasks.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      {errors.taskId && <div className="rf-error">{errors.taskId}</div>}
    </>
  )
}

// --- sorting -------------------------------------------------------

function sortOptions(opts, sortBy, frequencies, assignments, level) {
  const arr = opts.slice()
  if (sortBy === 'freq') {
    arr.sort((a, b) => {
      const fa = totalFrequency(a.id, level, assignments, frequencies)
      const fb = totalFrequency(b.id, level, assignments, frequencies)
      if (fb !== fa) return fb - fa // descending
      return collator.compare(a.name, b.name) // tiebreak alphabetical
    })
  } else {
    arr.sort((a, b) => collator.compare(a.name, b.name))
  }
  return arr
}

// Hebrew/Arabic-locale-aware string compare.
const collator = new Intl.Collator(['he', 'en'], { sensitivity: 'base', numeric: true })

// At the task level, frequency is the raw count. At project/client level, sum
// the counts of all tasks rolling up to that node.
function totalFrequency(id, level, assignments, frequencies) {
  if (level === 'task') return frequencies[id] || 0
  let total = 0
  for (const a of assignments) {
    if (level === 'project' && a.projectId === id) total += frequencies[a.taskId] || 0
    if (level === 'client' && a.clientId === id) total += frequencies[a.taskId] || 0
  }
  return total
}
