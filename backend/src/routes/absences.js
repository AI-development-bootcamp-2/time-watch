const router = require('express').Router()
const { db } = require('../db/knex')

const VALID_TYPES = ['vacation', 'sick', 'military_reserve', 'other']
const FUTURE_ALLOWED_TYPES = ['sick', 'military_reserve']

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function countWorkingDays(start, end) {
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 5 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Returns all absence entries for the logged-in user, excluding soft-deleted rows.
// Accepts optional ?month=YYYY-MM to filter entries that overlap the given month.
router.get('/', async (req, res) => {
  const userId = req.user.id
  const { month } = req.query

  let query = db('absence_entries')
    .where({ user_id: userId })
    .whereNull('deleted_at')
    .orderBy('start_date', 'asc')

  if (month) {
    const start = `${month}-01`
    const end = `${month}-31`
    query = query.where(function () {
      this.whereBetween('start_date', [start, end])
        .orWhereBetween('end_date', [start, end])
    })
  }

  const absences = await query
  res.json(absences)
})

// Validates the absence body and returns { error, status } or { clippedEndStr } on success.
async function validateAbsenceBody({ type, start_date, end_date, is_partial, partial_hours }) {
  if (!VALID_TYPES.includes(type)) {
    return { status: 400, error: 'Invalid absence type' }
  }
  if (!start_date || !end_date) {
    return { status: 400, error: 'start_date and end_date are required' }
  }
  const start = parseDate(start_date)
  const end = parseDate(end_date)
  if (end < start) {
    return { status: 400, error: 'end_date must be on or after start_date' }
  }
  if (countWorkingDays(start, end) === 0) {
    return { status: 400, error: 'Date range contains no working days (Friday and Saturday are not working days)' }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!FUTURE_ALLOWED_TYPES.includes(type) && start > today) {
    return { status: 400, error: 'Only sick leave and military reserve may be reported for future dates' }
  }
  if (is_partial) {
    const hours = Number(partial_hours)
    if (!partial_hours || hours <= 0 || hours >= 9) {
      return { status: 400, error: 'partial_hours must be greater than 0 and less than 9 when is_partial is true' }
    }
  }
  const year = start.getFullYear()
  const month = start.getMonth() + 1
  const lock = await db('month_locks').where({ year, month }).first()
  if (lock) {
    return { status: 423, error: 'This month is locked and cannot be modified' }
  }
  const lastOfMonth = new Date(year, month, 0)
  const clippedEnd = end > lastOfMonth ? lastOfMonth : end
  return { clippedEndStr: toDateStr(clippedEnd) }
}

// PUT  /api/absences/:id — Updates an existing absence entry. Only the owner or an admin may update.
// Applies the same validations as POST and checks month locks on the new range.
router.post('/', async (req, res) => {
  const { type, start_date, end_date, is_partial = false, partial_hours = null, notes = null } = req.body
  const userId = req.user.id

  const validation = await validateAbsenceBody({ type, start_date, end_date, is_partial, partial_hours })
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error })
  }

  const [absence] = await db('absence_entries')
    .insert({
      user_id: userId,
      type,
      start_date,
      end_date: validation.clippedEndStr,
      is_partial,
      partial_hours: is_partial ? partial_hours : null,
      notes,
    })
    .returning('*')

  res.status(201).json(absence)
})

// POST /api/absences/:id/document — Uploads a supporting document (PDF/JPG/PNG, max 20 MB) for a given absence.
// Replaces any previously uploaded file and updates document_url on the record.
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { type, start_date, end_date, is_partial = false, partial_hours = null, notes = null } = req.body
  const userId = req.user.id

  const existing = await db('absence_entries').where({ id }).whereNull('deleted_at').first()
  if (!existing) {
    return res.status(404).json({ error: 'Absence not found' })
  }

  if (existing.user_id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const validation = await validateAbsenceBody({ type, start_date, end_date, is_partial, partial_hours })
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error })
  }

  const [updated] = await db('absence_entries')
    .where({ id })
    .update({
      type,
      start_date,
      end_date: validation.clippedEndStr,
      is_partial,
      partial_hours: is_partial ? partial_hours : null,
      notes,
      updated_at: db.fn.now(),
    })
    .returning('*')

  res.json(updated)
})


module.exports = router
