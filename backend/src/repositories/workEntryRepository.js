const knex = require('../db/knex')

/**
 * Fetch all work entries for a given user within a calendar month.
 *
 * Joins tasks → projects → clients so the caller receives display names
 * without needing extra round-trips.
 *
 * @param {number} userId
 * @param {string} month - Calendar month in "YYYY-MM" format (e.g. "2025-05")
 * @returns {Promise<object[]>} Array of work entry rows augmented with
 *   task_name, project_name, and client_name.
 */
async function getMonthlyEntries(userId, month) {
  // Derive first and last day of the month from the "YYYY-MM" string so we
  // never rely on the DB engine to parse a partial date string.
  const [year, mon] = month.split('-').map(Number)
  const firstDay = new Date(Date.UTC(year, mon - 1, 1))
  const lastDay = new Date(Date.UTC(year, mon, 0)) // day 0 of next month = last day of this month

  const firstStr = firstDay.toISOString().slice(0, 10) // "YYYY-MM-01"
  const lastStr = lastDay.toISOString().slice(0, 10)   // "YYYY-MM-DD"

  const rows = await knex('work_entries')
    .leftJoin('tasks',    'work_entries.task_id',    'tasks.id')
    .leftJoin('projects', 'tasks.project_id',        'projects.id')
    .leftJoin('clients',  'projects.client_id',      'clients.id')
    .where('work_entries.user_id', userId)
    .andWhere('work_entries.date', '>=', firstStr)
    .andWhere('work_entries.date', '<=', lastStr)
    .whereNull('work_entries.deleted_at')
    .select(
      'work_entries.*',
      'tasks.name as task_name',
      'projects.name as project_name',
      'clients.name as client_name'
    )
    .orderBy('work_entries.date', 'asc')
    .orderBy('work_entries.start_time', 'asc')

  return rows
}

/**
 * Fetch all absences for a given user within a calendar month.
 *
 * @param {number} userId
 * @param {string} month - Calendar month in "YYYY-MM" format (e.g. "2025-05")
 * @returns {Promise<object[]>} Array of absence rows ordered by start_date ascending.
 */
async function getMonthlyAbsences(userId, month) {
  const [year, mon] = month.split('-').map(Number)
  const firstDay = new Date(Date.UTC(year, mon - 1, 1))
  const lastDay = new Date(Date.UTC(year, mon, 0)) // day 0 of next month = last day of this month

  const firstStr = firstDay.toISOString().slice(0, 10) // "YYYY-MM-01"
  const lastStr = lastDay.toISOString().slice(0, 10)   // "YYYY-MM-DD"

  const rows = await knex('absence_entries')
    .where('user_id', userId)
    .andWhere('start_date', '>=', firstStr)
    .andWhere('start_date', '<=', lastStr)
    .whereNull('deleted_at')
    .orderBy('start_date', 'asc')

  return rows
}

module.exports = { getMonthlyEntries, getMonthlyAbsences }
