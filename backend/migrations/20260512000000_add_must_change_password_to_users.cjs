'use strict';

exports.up = async function up(knex) {
  const exists = await knex.schema.hasColumn('users', 'must_change_password');
  if (!exists) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('must_change_password').notNullable().defaultTo(false);
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('must_change_password');
  });
};
