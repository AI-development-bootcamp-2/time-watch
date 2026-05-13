const router = require('express').Router()
const { findActiveTimer, createTimer, deleteTimer } = require('../repositories/timerRepository')
const knex = require('../db/knex')

// Resolves the authenticated user's id from the JWT-populated req.user. Returns null when missing.
function getUserId(req) {
  return req.user && req.user.id ? req.user.id : null
}

/**
 * @swagger
 * /api/timer/status:
 *   get:
 *     summary: Get active timer status
 *     tags: [Timer]
 *     responses:
 *       200:
 *         description: Active timer or null
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timer:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/TimerState'
 *                     - type: object
 *                       nullable: true
 */
router.get('/status', async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ message: 'Authentication required' })
    const timer = await findActiveTimer(userId)
    res.json({ timer: timer ?? null })
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/timer/start:
 *   post:
 *     summary: Start a new timer
 *     tags: [Timer]
 *     responses:
 *       201:
 *         description: Timer started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timer:
 *                   $ref: '#/components/schemas/TimerState'
 *       409:
 *         description: Timer already active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/start', async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ message: 'Authentication required' })
    const existing = await findActiveTimer(userId)
    if (existing) {
      return res.status(409).json({ message: 'Timer already active' })
    }
    const timer = await createTimer(userId)
    return res.status(201).json({ timer })
  } catch (err) {
    console.error('[POST /start] error:', err.message)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/timer/stop:
 *   post:
 *     summary: Stop the active timer and save a work entry
 *     tags: [Timer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [task_id, location]
 *             properties:
 *               task_id:
 *                 type: integer
 *               location:
 *                 type: string
 *                 enum: [משרד, לקוח, בית]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Work entry saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entry:
 *                   $ref: '#/components/schemas/WorkEntry'
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: No active timer
 */
// Convert a UTC Date to a local HH:MM:SS string using the client's timezone offset.
// getTimezoneOffset() returns minutes where local = UTC - offset (e.g. Israel UTC+3 → -180).
function utcToLocalTimeStr(utcDate, offsetMin) {
  const localMs = utcDate.getTime() - offsetMin * 60 * 1000
  const d = new Date(localMs)
  return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':')
}

router.post('/stop', async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ message: 'Authentication required' })
    const { task_id, location, description, timezone_offset_minutes } = req.body
    const offsetMin = typeof timezone_offset_minutes === 'number' ? timezone_offset_minutes : 0

    const timer = await findActiveTimer(userId)
    if (!timer) {
      return res.status(404).json({ message: 'No active timer' })
    }

    const stopMs = Date.now()
    const start_time = utcToLocalTimeStr(new Date(timer.start_time), offsetMin)
    const end_time = utcToLocalTimeStr(new Date(stopMs), offsetMin)

    // Compute duration from epoch ms so crossing midnight never produces a negative value
    const duration_hours = Math.round(((stopMs - new Date(timer.start_time).getTime()) / 3600000) * 100) / 100

    const [entry] = await knex('work_entries')
      .insert({
        user_id: userId,
        task_id: task_id ?? null,
        date: timer.date,
        location: location ?? null,
        start_time,
        end_time,
        duration_hours,
        description: description ?? null,
      })
      .returning('*')

    await deleteTimer(userId)

    return res.status(200).json({ entry })
  } catch (err) {
    console.error('[POST /stop] error:', err.message)
    res.status(500).json({ message: 'Internal server error' })
  }
})

module.exports = router
