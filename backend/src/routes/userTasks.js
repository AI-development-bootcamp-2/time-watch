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

// Assigns a user to a task, restoring a soft-deleted row if one exists, or inserting a new one
router.post('/', async (req, res) => {
  try {
    const { user_id, task_id } = req.body

    if (!user_id || !task_id || !Number.isInteger(Number(user_id)) || !Number.isInteger(Number(task_id))) {
      return res.status(400).json({ message: 'user_id and task_id are required and must be valid integers' })
    }

    const uid = Number(user_id)
    const tid = Number(task_id)

    // Check for a soft-deleted row for the same pair
    const deleted = await db('user_tasks')
      .where({ user_id: uid, task_id: tid })
      .whereNotNull('deleted_at')
      .first()

    if (deleted) {
      // Restore the soft-deleted row
      await db('user_tasks')
        .where({ user_id: uid, task_id: tid })
        .update({ deleted_at: null, updated_at: db.fn.now() })

      const restored = await db('user_tasks')
        .where({ user_id: uid, task_id: tid })
        .select('user_id', 'task_id', 'assigned_at')
        .first()

      return res.status(201).json(restored)
    }

    // Check for an active row before insert to give a clear 409
    const active = await db('user_tasks')
      .where({ user_id: uid, task_id: tid })
      .whereNull('deleted_at')
      .first()

    if (active) {
      return res.status(409).json({ message: 'Assignment already exists' })
    }

    // Insert new assignment
    const [inserted] = await db('user_tasks')
      .insert({ user_id: uid, task_id: tid, assigned_at: db.fn.now() })
      .returning(['user_id', 'task_id', 'assigned_at'])

    return res.status(201).json(inserted)
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Assignment already exists' })
    }
    console.error('POST /api/user-tasks error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

module.exports = router
