'use strict'

/**
 * Parse a time string "HH:MM:SS" or "HH:MM" into decimal hours.
 * @param {string} timeStr
 * @returns {number}
 */
function parseTimeToHours(timeStr) {
  const parts = timeStr.split(':').map(Number)
  const hours = parts[0] || 0
  const minutes = parts[1] || 0
  const seconds = parts[2] || 0
  return hours + minutes / 60 + seconds / 3600
}

/**
 * Compute the display status for a single calendar day.
 *
 * @param {string}        dateStr  - ISO date "YYYY-MM-DD"
 * @param {object[]}      entries  - work entry objects for that day (may be empty)
 * @param {object|null}   absence  - single absence object covering that day, or null
 * @returns {"weekend"|"missing"|"full"|"exceptional"}
 */
function computeDayStatus(dateStr, entries, absence) {
  // Weekend check: Friday = 5, Saturday = 6 (UTC day)
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay()
  if (dow === 5 || dow === 6) {
    return 'weekend'
  }

  // No entries and no absence → missing
  if ((!entries || entries.length === 0) && !absence) {
    return 'missing'
  }

  // Absence covers the day → full regardless of hours
  if (absence) {
    return 'full'
  }

  // Calculate total hours from entries
  const totalHours = entries.reduce((sum, entry) => {
    const start = parseTimeToHours(entry.start_time)
    const end = parseTimeToHours(entry.end_time)
    return sum + (end - start)
  }, 0)

  // Exactly 9 hours → full; any other amount → exceptional
  if (totalHours === 9) {
    return 'full'
  }

  return 'exceptional'
}

module.exports = { computeDayStatus }
