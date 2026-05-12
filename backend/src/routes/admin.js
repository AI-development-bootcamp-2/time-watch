const router = require('express').Router()
const { requireRole } = require('../middleware/auth')

router.use(requireRole('admin'))

// Admin-specific routes (user-task assignments, audit log)

module.exports = router
