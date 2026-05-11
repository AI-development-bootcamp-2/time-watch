const router = require('express').Router()
const { requireRole } = require('../middleware/auth')

router.use(requireRole('admin'))

// GET  /api/tasks
// POST /api/tasks
// PUT  /api/tasks/:id

module.exports = router
