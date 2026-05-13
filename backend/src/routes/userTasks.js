const router = require('express').Router()
const { requireRole } = require('../middleware/auth')
const db = require('../db/knex')

router.use(requireRole('admin', 'project_manager'))

// Returns active user-task assignments filtered by user_id or task_id, joined with user, task, project, and client
router.get('/', async (req, res) => {
  try {
    const { user_id, task_id } = req.query

    if (!user_id && !task_id) {
      return res.status(400).json({ message: 'At least one of user_id or task_id must be provided' })
    }

    const query = db('user_tasks')
      .join('users', 'user_tasks.user_id', 'users.id')
      .join('tasks', 'user_tasks.task_id', 'tasks.id')
      .join('projects', 'tasks.project_id', 'projects.id')
      .join('clients', 'projects.client_id', 'clients.id')
      .select(
        'user_tasks.user_id',
        'users.full_name',
        'user_tasks.task_id',
        'tasks.name as task_name',
        'projects.name as project_name',
        'clients.name as client_name',
        'user_tasks.assigned_at'
      )
      .whereNull('user_tasks.deleted_at')

    if (user_id) {
      query.where('user_tasks.user_id', user_id)
    }

    if (task_id) {
      query.where('user_tasks.task_id', task_id)
    }

    const userTasks = await query
    res.json(userTasks)
  } catch (err) {
    console.error('GET /api/user-tasks error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

module.exports = router
