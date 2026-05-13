const router = require('express').Router()
const { requireRole } = require('../middleware/auth')

router.use(requireRole('admin'))

// GET    /api/month-locks
// POST   /api/month-locks
// DELETE /api/month-locks/:id

module.exports = router
