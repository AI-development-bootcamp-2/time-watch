// Extends the type check constraint on absences to include half_vacation_day.
exports.up = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE absences
      DROP CONSTRAINT IF EXISTS absences_type_check
  `)
  await knex.schema.raw(`
    ALTER TABLE absences
      ADD CONSTRAINT absences_type_check
      CHECK (type IN ('vacation', 'half_vacation_day', 'sick', 'military_reserve', 'other'))
  `)
}

exports.down = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE absences
      DROP CONSTRAINT IF EXISTS absences_type_check
  `)
  await knex.schema.raw(`
    ALTER TABLE absences
      ADD CONSTRAINT absences_type_check
      CHECK (type IN ('vacation', 'sick', 'military_reserve', 'other'))
  `)
}
