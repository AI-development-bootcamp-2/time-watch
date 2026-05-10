const router = require('express').Router()
const { findActiveTimer } = require('../repositories/timerRepository')

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

// POST /api/timer/start
// POST /api/timer/stop

module.exports = router
