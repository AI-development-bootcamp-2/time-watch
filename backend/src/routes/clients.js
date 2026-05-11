const router = require('express').Router()
const { requireRole } = require('../middleware/auth')

router.use(requireRole('admin'))

// GET  /api/clients
// POST /api/clients
// PUT  /api/clients/:id

module.exports = router
