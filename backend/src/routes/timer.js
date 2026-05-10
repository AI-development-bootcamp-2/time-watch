const router = require('express').Router()
const { findActiveTimer, createTimer } = require('../repositories/timerRepository')

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

// POST /api/timer/stop

module.exports = router
