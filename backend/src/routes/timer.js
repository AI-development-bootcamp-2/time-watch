const router = require('express').Router()
const { findActiveTimer, createTimer, deleteTimer } = require('../repositories/timerRepository')
const knex = require('../db/knex')

// Hardcoded until real auth middleware is wired in (Task N)
const STUB_USER_ID = 1

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
    const userId = STUB_USER_ID
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
    const userId = STUB_USER_ID
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
router.post('/stop', async (req, res) => {
  try {
    const userId = STUB_USER_ID
    const { task_id, location, description } = req.body

    if (!task_id || !location) {
      return res.status(400).json({ message: 'task_id and location are required' })
    }

    const timer = await findActiveTimer(userId)
    if (!timer) {
      return res.status(404).json({ message: 'No active timer' })
    }

    const timerStart = new Date(timer.start_time)
    const startHH = String(timerStart.getUTCHours()).padStart(2, '0')
    const startMM = String(timerStart.getUTCMinutes()).padStart(2, '0')
    const startSS = String(timerStart.getUTCSeconds()).padStart(2, '0')
    const start_time = `${startHH}:${startMM}:${startSS}`

    const now = new Date()
    const endHH = String(now.getUTCHours()).padStart(2, '0')
    const endMM = String(now.getUTCMinutes()).padStart(2, '0')
    const endSS = String(now.getUTCSeconds()).padStart(2, '0')
    const end_time = `${endHH}:${endMM}:${endSS}`

    const parseHours = (t) => {
      const [h, m, s] = t.split(':').map(Number)
      return h + m / 60 + (s || 0) / 3600
    }
    const duration_hours = Math.round((parseHours(end_time) - parseHours(start_time)) * 100) / 100

    const [entry] = await knex('work_entries')
      .insert({
        user_id: userId,
        task_id,
        date: timer.date,
        location,
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
