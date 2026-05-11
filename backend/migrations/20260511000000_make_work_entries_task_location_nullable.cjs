exports.up = async (knex) => {
  await knex.schema.alterTable('work_entries', (table) => {
    table.integer('task_id').unsigned().nullable().alter()
    table.string('location').nullable().alter()
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('work_entries', (table) => {
    table.integer('task_id').unsigned().notNullable().alter()
    table.string('location').notNullable().alter()
  })
}
