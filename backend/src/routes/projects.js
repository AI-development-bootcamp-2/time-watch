const router = require('express').Router()
const { requireRole } = require('../middleware/auth')

router.use(requireRole('admin'))

// GET  /api/projects
// POST /api/projects
// PUT  /api/projects/:id

module.exports = router
