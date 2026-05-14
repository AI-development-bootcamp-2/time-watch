// Inserts demo clients, projects, tasks, and assigns them to the admin user
exports.seed = async (knex) => {
  const admin = await knex('users').where({ email: 'admin@timewatch.local' }).first()
  if (!admin) return

  const demoData = [
    {
      clientName: 'חברת אלפא בע״מ',
      projects: [
        {
          name: 'פיתוח אפליקציית מובייל',
          tasks: ['תכנון ואפיון', 'פיתוח ממשק משתמש', 'פיתוח שרת', 'בדיקות QA', 'השקה ותמיכה'],
        },
        {
          name: 'עיצוב מחדש של האתר',
          tasks: ['מחקר UX', 'עיצוב גרפי', 'פיתוח פרונטאנד', 'בדיקות נגישות'],
        },
      ],
    },
    {
      clientName: 'מכון הטכנולוגיה',
      projects: [
        {
          name: 'מערכת ניהול פנימית',
          tasks: ['ניתוח דרישות', 'ארכיטקטורה ותכנון', 'פיתוח מודול משתמשים', 'אינטגרציות חיצוניות'],
        },
        {
          name: 'תשתית ענן',
          tasks: ['הגדרת סביבות', 'CI/CD', 'ניטור ואלרטים', 'אבטחת מידע'],
        },
      ],
    },
    {
      clientName: 'סטארטאפ ביטא',
      projects: [
        {
          name: 'MVP - גרסה ראשונה',
          tasks: ['הגדרת מוצר', 'פיתוח פרונטאנד', 'פיתוח בקאנד', 'בדיקות משתמשים'],
        },
      ],
    },
  ]

  for (const { clientName, projects } of demoData) {
    // Upsert client
    let client = await knex('clients').where({ name: clientName }).whereNull('deleted_at').first()
    if (!client) {
      ;[client] = await knex('clients').insert({ name: clientName, is_active: true }).returning('*')
    }

    for (const { name: projectName, tasks } of projects) {
      // Upsert project
      let project = await knex('projects')
        .where({ client_id: client.id, name: projectName })
        .whereNull('deleted_at')
        .first()
      if (!project) {
        ;[project] = await knex('projects')
          .insert({ name: projectName, client_id: client.id, is_active: true })
          .returning('*')
      }

      for (const taskName of tasks) {
        // Upsert task
        let task = await knex('tasks')
          .where({ project_id: project.id, name: taskName })
          .whereNull('deleted_at')
          .first()
        if (!task) {
          ;[task] = await knex('tasks')
            .insert({ name: taskName, project_id: project.id, status: 'open' })
            .returning('*')
        }

        // Assign task to admin if not already assigned
        const assigned = await knex('user_tasks')
          .where({ user_id: admin.id, task_id: task.id })
          .whereNull('deleted_at')
          .first()
        if (!assigned) {
          await knex('user_tasks').insert({ user_id: admin.id, task_id: task.id })
        }
      }
    }
  }
}
