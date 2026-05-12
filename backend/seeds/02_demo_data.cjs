exports.seed = async (knex) => {
  const user = await knex('users').where({ email: 'admin@timewatch.local' }).first();
  if (!user) return;

  const userId = user.id;
  const now = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [year, mon] = now.split('-').map(Number);

  // Client
  let client = await knex('clients').where({ name: 'לקוח דמו' }).first();
  if (!client) {
    [client] = await knex('clients').insert({ name: 'לקוח דמו', is_active: true }).returning('*');
  }

  // Project
  let project = await knex('projects').where({ name: 'פרויקט דמו' }).first();
  if (!project) {
    [project] = await knex('projects')
      .insert({ name: 'פרויקט דמו', client_id: client.id, is_active: true })
      .returning('*');
  }

  // Task
  let task = await knex('tasks').where({ name: 'משימת דמו' }).first();
  if (!task) {
    [task] = await knex('tasks')
      .insert({ name: 'משימת דמו', project_id: project.id, status: 'open' })
      .returning('*');
  }

  // Work entries: 3 days this month (1st, 2nd, 3rd — skip if weekend)
  const entries = [];
  for (let day = 1; day <= 3; day++) {
    const date = new Date(Date.UTC(year, mon - 1, day));
    const dow = date.getUTCDay();
    if (dow === 5 || dow === 6) continue; // skip Fri/Sat

    const dateStr = date.toISOString().slice(0, 10);
    const exists = await knex('work_entries').where({ user_id: userId, date: dateStr }).first();
    if (!exists) {
      entries.push({
        user_id: userId,
        task_id: task.id,
        date: dateStr,
        location: 'משרד',
        start_time: '09:00:00',
        end_time: '18:00:00',
        duration_hours: 9,
        description: `יום עבודה ${day}`,
      });
    }
  }

  if (entries.length) await knex('work_entries').insert(entries);
};
