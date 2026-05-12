// Replaces the on-disk document_url column with BLOB storage columns.
exports.up = async function (knex) {
  await knex.schema.raw('ALTER TABLE absence_entries ADD COLUMN IF NOT EXISTS document_data bytea')
  await knex.schema.raw('ALTER TABLE absence_entries ADD COLUMN IF NOT EXISTS document_filename varchar(500)')
  await knex.schema.raw('ALTER TABLE absence_entries ADD COLUMN IF NOT EXISTS document_mimetype varchar(100)')
  await knex.schema.raw('ALTER TABLE absence_entries DROP COLUMN IF EXISTS document_url')
}

exports.down = async function (knex) {
  await knex.schema.raw('ALTER TABLE absence_entries DROP COLUMN IF EXISTS document_data')
  await knex.schema.raw('ALTER TABLE absence_entries DROP COLUMN IF EXISTS document_filename')
  await knex.schema.raw('ALTER TABLE absence_entries DROP COLUMN IF EXISTS document_mimetype')
  await knex.schema.raw('ALTER TABLE absence_entries ADD COLUMN IF NOT EXISTS document_url varchar(500)')
}
