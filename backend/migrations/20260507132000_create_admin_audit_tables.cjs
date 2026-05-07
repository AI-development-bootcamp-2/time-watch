function addTimestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

async function ensureColumn(knex, tableName, columnName, addColumn) {
  const exists = await knex.schema.hasColumn(tableName, columnName);

  if (!exists) {
    await knex.schema.alterTable(tableName, (table) => addColumn(table));
  }
}

exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable("month_locks"))) {
    await knex.schema.createTable("month_locks", (table) => {
      table.increments("id").primary();
      table.integer("year").notNullable();
      table.integer("month").notNullable();
      table.integer("locked_by").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
      table.timestamp("locked_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.text("notes").nullable();
      addTimestamps(table, knex);
      table.index(["year", "month"]);
      table.index(["locked_by"]);
    });
  } else {
    await ensureColumn(knex, "month_locks", "locked_by", (table) => table.integer("locked_by").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL"));
    await ensureColumn(knex, "month_locks", "locked_at", (table) => table.timestamp("locked_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "month_locks", "notes", (table) => table.text("notes").nullable());
    await ensureColumn(knex, "month_locks", "created_at", (table) => table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "month_locks", "updated_at", (table) => table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
  }

  if (!(await knex.schema.hasTable("audit_log"))) {
    await knex.schema.createTable("audit_log", (table) => {
      table.increments("id").primary();
      table.integer("actor_user_id").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
      table.integer("target_user_id").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
      table.string("entity_type", 100).notNullable();
      table.integer("entity_id").nullable();
      table.string("action", 100).notNullable();
      table.jsonb("old_values").nullable();
      table.jsonb("new_values").nullable();
      table.jsonb("metadata").nullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.index(["actor_user_id"]);
      table.index(["target_user_id"]);
      table.index(["entity_type", "entity_id"]);
      table.index(["created_at"]);
    });
  } else {
    await ensureColumn(knex, "audit_log", "actor_user_id", (table) => table.integer("actor_user_id").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL"));
    await ensureColumn(knex, "audit_log", "target_user_id", (table) => table.integer("target_user_id").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL"));
    await ensureColumn(knex, "audit_log", "entity_type", (table) => table.string("entity_type", 100).notNullable().defaultTo("unknown"));
    await ensureColumn(knex, "audit_log", "entity_id", (table) => table.integer("entity_id").nullable());
    await ensureColumn(knex, "audit_log", "action", (table) => table.string("action", 100).notNullable().defaultTo("unknown"));
    await ensureColumn(knex, "audit_log", "old_values", (table) => table.jsonb("old_values").nullable());
    await ensureColumn(knex, "audit_log", "new_values", (table) => table.jsonb("new_values").nullable());
    await ensureColumn(knex, "audit_log", "metadata", (table) => table.jsonb("metadata").nullable());
    await ensureColumn(knex, "audit_log", "created_at", (table) => table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
  }

  await knex.schema.raw("CREATE UNIQUE INDEX IF NOT EXISTS month_locks_year_month_unique ON month_locks (year, month)");
  await knex.schema.raw("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'month_locks_month_range_check') THEN ALTER TABLE month_locks ADD CONSTRAINT month_locks_month_range_check CHECK (month >= 1 AND month <= 12); END IF; END $$");
  await knex.schema.raw("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'month_locks_year_range_check') THEN ALTER TABLE month_locks ADD CONSTRAINT month_locks_year_range_check CHECK (year >= 2000 AND year <= 2100); END IF; END $$");
  await knex.schema.raw("CREATE INDEX IF NOT EXISTS audit_log_actor_user_id_idx ON audit_log (actor_user_id)");
  await knex.schema.raw("CREATE INDEX IF NOT EXISTS audit_log_target_user_id_idx ON audit_log (target_user_id)");
  await knex.schema.raw("CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log (entity_type, entity_id)");
  await knex.schema.raw("CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at)");
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("audit_log");
  await knex.schema.dropTableIfExists("month_locks");
};
