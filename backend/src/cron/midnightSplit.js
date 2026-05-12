'use strict'

const cron = require('node-cron')
const defaultKnex = require('../db/knex')

/**
 * Finds all timer_state rows whose `date` is before today (stale timers
 * that were left running across midnight) and resets their start_time and
 * date to the beginning of the current day so they continue as a fresh
 * timer on today's date.
 *
 * Accepts an optional knex instance so the function can be exercised in
 * unit tests without touching a real database.
 *
 * @param {import('knex').Knex} [database]
 * @returns {Promise<void>}
 */
async function runMidnightSplit(database) {
  const db = database || defaultKnex

  const staleTimers = await db('timer_state')
    .where('date', '<', db.raw('CURRENT_DATE'))
    .select('*')

  for (const row of staleTimers) {
    await db('timer_state')
      .where({ user_id: row.user_id })
      .update({
        start_time: db.raw('CURRENT_DATE::timestamptz'),
        date: db.raw('CURRENT_DATE'),
      })
  }

  console.log(`[midnightSplit] split ${staleTimers.length} timer(s)`)
}

/**
 * Registers a node-cron job that fires at midnight every day (00:00) and
 * calls runMidnightSplit with the production knex instance.
 */
function scheduleMidnightSplit() {
  cron.schedule('0 0 * * *', () => runMidnightSplit())
}

module.exports = { runMidnightSplit, scheduleMidnightSplit }
