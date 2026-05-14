// Replaces absence type constraint: adds half_day_vac, removes other.
exports.up = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE absences
      DROP CONSTRAINT IF EXISTS absences_type_check
  `)
  await knex.schema.raw(`
    ALTER TABLE absences
      ADD CONSTRAINT absences_type_check
      CHECK (type IN ('vacation', 'half_day_vac', 'sick', 'military_reserve'))
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
