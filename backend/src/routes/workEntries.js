'use strict'

const router = require('express').Router()
const { getMonthlyEntries, getMonthlyAbsences } = require('../repositories/workEntryRepository')
const { computeDayStatus } = require('../utils/dayStatus')

/**
 * @swagger
 * tags:
 *   - name: WorkEntries
 *     description: Work entry management and monthly summaries
 */

/**
 * @swagger
 * /api/work-entries:
 *   get:
 *     summary: Get monthly work summary for a user
 *     tags: [WorkEntries]
 *     parameters:
 *       - name: month
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "2025-05"
 *         description: Calendar month in YYYY-MM format
 *       - name: userId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: User ID (defaults to authenticated user; stub = 1)
 *     responses:
 *       200:
 *         description: Monthly day-by-day breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 month:
 *                   type: string
 *                   example: "2025-05"
 *                 userId:
 *                   type: integer
 *                 days:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       status:
 *                         type: string
 *                         enum: [full, missing, exceptional, weekend]
 *                       totalHours:
 *                         type: number
 *                       entries:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/WorkEntry'
 *                       absence:
 *                         oneOf:
 *                           - type: object
 *                           - type: "null"
 *       400:
 *         description: Invalid or missing month param
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const { month, userId: userIdParam } = req.query

    // Validate month param
    if (!month) {
      return res.status(400).json({ message: 'month query parameter is required' })
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'month must be in YYYY-MM format' })
    }

    // Resolve userId — stub: default to 1 (auth middleware comes later)
    let userId
    if (!userIdParam || userIdParam === 'me') {
      userId = 1
    } else {
      userId = parseInt(userIdParam, 10)
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'userId must be an integer' })
      }
    }

    // Fetch data from repositories
    const [entries, absences] = await Promise.all([
      getMonthlyEntries(userId, month),
      getMonthlyAbsences(userId, month),
    ])

    // Build calendar for every day in the month
    const [year, mon] = month.split('-').map(Number)
    const firstDay = new Date(Date.UTC(year, mon - 1, 1))
    const lastDay = new Date(Date.UTC(year, mon, 0))
    const totalDays = lastDay.getUTCDate()

    const days = []
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`

      // Filter entries for this date
      const dayEntries = entries.filter(e => {
        const entryDate = typeof e.date === 'string'
          ? e.date.slice(0, 10)
          : new Date(e.date).toISOString().slice(0, 10)
        return entryDate === dateStr
      })

      // Find absence covering this date
      const absence = absences.find(a => {
        const start = typeof a.start_date === 'string'
          ? a.start_date.slice(0, 10)
          : new Date(a.start_date).toISOString().slice(0, 10)
        const end = typeof a.end_date === 'string'
          ? a.end_date.slice(0, 10)
          : new Date(a.end_date).toISOString().slice(0, 10)
        return start <= dateStr && dateStr <= end
      }) || null

      // Compute total hours (2 decimal places)
      const totalHours = parseFloat(
        dayEntries.reduce((sum, entry) => {
          const parseTime = (t) => {
            const parts = t.split(':').map(Number)
            return (parts[0] || 0) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600
          }
          return sum + (parseTime(entry.end_time) - parseTime(entry.start_time))
        }, 0).toFixed(2)
      )

      const status = computeDayStatus(dateStr, dayEntries, absence)

      days.push({ date: dateStr, status, totalHours, entries: dayEntries, absence })
    }

    return res.status(200).json({ month, userId, days })
  } catch (err) {
    console.error('GET /api/work-entries error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

module.exports = router
