// Extends the type check constraint on absence_entries to include half_vacation_day.
exports.up = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE absence_entries
      DROP CONSTRAINT IF EXISTS absence_entries_type_check
  `)
  await knex.schema.raw(`
    ALTER TABLE absence_entries
      ADD CONSTRAINT absence_entries_type_check
      CHECK (type IN ('vacation', 'half_vacation_day', 'sick', 'military_reserve', 'other'))
  `)
}

exports.down = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE absence_entries
      DROP CONSTRAINT IF EXISTS absence_entries_type_check
  `)
  await knex.schema.raw(`
    ALTER TABLE absence_entries
      ADD CONSTRAINT absence_entries_type_check
      CHECK (type IN ('vacation', 'sick', 'military_reserve', 'other'))
  `)
}
