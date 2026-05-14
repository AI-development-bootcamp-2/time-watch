exports.up = async (knex) => {
  await knex.schema.raw(`
    ALTER TABLE work_entries DROP CONSTRAINT IF EXISTS work_entries_time_order_check
  `)
  await knex.schema.raw(`
    ALTER TABLE work_entries ADD CONSTRAINT work_entries_time_order_check CHECK (end_time >= start_time)
  `)
}

exports.down = async (knex) => {
  await knex.schema.raw(`
    ALTER TABLE work_entries DROP CONSTRAINT IF EXISTS work_entries_time_order_check
  `)
  await knex.schema.raw(`
    ALTER TABLE work_entries ADD CONSTRAINT work_entries_time_order_check CHECK (end_time > start_time)
  `)
}
