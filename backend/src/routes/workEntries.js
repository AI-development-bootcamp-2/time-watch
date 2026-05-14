'use strict'

const router = require('express').Router()
const { getMonthlyEntries, getMonthlyAbsences, insertWorkEntry } = require('../repositories/workEntryRepository')
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

    // Resolve userId from the JWT — never trust a userId from the client unless the
    // caller is an admin (admins may inspect other users' monthly summaries).
    const authUserId = req.user && req.user.id
    if (!authUserId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    let userId
    if (!userIdParam || userIdParam === 'me') {
      userId = authUserId
    } else {
      const parsed = parseInt(userIdParam, 10)
      if (isNaN(parsed)) {
        return res.status(400).json({ message: 'userId must be an integer' })
      }
      if (parsed !== authUserId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' })
      }
      userId = parsed
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

/**
 * @swagger
 * /api/work-entries:
 *   post:
 *     summary: Create work entries for a given date
 *     tags: [WorkEntries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, entries]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-05-13"
 *               entries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [start_time, end_time]
 *                   properties:
 *                     start_time:
 *                       type: string
 *                       example: "09:00"
 *                     end_time:
 *                       type: string
 *                       example: "18:00"
 *                     location:
 *                       type: string
 *                       enum: [משרד, לקוח, בית]
 *                     task_id:
 *                       type: integer
 *                     description:
 *                       type: string
 *     responses:
 *       201:
 *         description: Created work entries
 *       400:
 *         description: Validation error
 */
router.post('/', async (req, res) => {
  try {
    const { date, entries } = req.body

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' })
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'entries must be a non-empty array' })
    }

    const timeRe = /^\d{2}:\d{2}$/
    for (const entry of entries) {
      if (!entry.start_time || !timeRe.test(entry.start_time)) {
        return res.status(400).json({ message: 'each entry requires start_time in HH:MM format' })
      }
      if (!entry.end_time || !timeRe.test(entry.end_time)) {
        return res.status(400).json({ message: 'each entry requires end_time in HH:MM format' })
      }
      if (entry.end_time <= entry.start_time) {
        return res.status(400).json({ message: 'end_time must be after start_time' })
      }
    }

    const userId = req.user.id

    const created = await Promise.all(
      entries.map(entry => insertWorkEntry(userId, { date, ...entry }))
    )

    return res.status(201).json(created)
  } catch (err) {
    console.error('POST /api/work-entries error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

module.exports = router
