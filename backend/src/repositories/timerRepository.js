const knex = require('../db/knex')

/**
 * Find the active timer row for a given user.
 * Returns the row object or undefined if none exists.
 *
 * @param {number} userId
 * @returns {Promise<object|undefined>}
 */
async function findActiveTimer(userId) {
  const row = await knex('timer_state').where({ user_id: userId }).limit(1).first()
  return row
}

/**
 * Create a new timer row for a user, capturing the current server timestamp
 * and date at insertion time.
 *
 * @param {number} userId
 * @returns {Promise<object>} The newly inserted row.
 */
async function createTimer(userId) {
  const [row] = await knex('timer_state')
    .insert({
      user_id: userId,
      start_time: knex.raw('NOW()'),
      date: knex.raw('CURRENT_DATE'),
    })
    .returning('*')
  return row
}

/**
 * Delete the timer row for a given user.
 *
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function deleteTimer(userId) {
  await knex('timer_state').where({ user_id: userId }).delete()
}

module.exports = { findActiveTimer, createTimer, deleteTimer }
