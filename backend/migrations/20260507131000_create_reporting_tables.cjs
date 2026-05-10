function addTimestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("deleted_at", { useTz: true }).nullable();
}

async function ensureColumn(knex, tableName, columnName, addColumn) {
  const exists = await knex.schema.hasColumn(tableName, columnName);

  if (!exists) {
    await knex.schema.alterTable(tableName, (table) => addColumn(table));
  }
}

exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable("work_entries"))) {
    await knex.schema.createTable("work_entries", (table) => {
      table.increments("id").primary();
      table.integer("user_id").unsigned().notNullable().references("id").inTable("users").onDelete("RESTRICT");
      table.integer("task_id").unsigned().notNullable().references("id").inTable("tasks").onDelete("RESTRICT");
      table.date("date").notNullable();
      table.enu("location", ["office", "client_site", "home"]).notNullable();
      table.time("start_time").notNullable();
      table.time("end_time").notNullable();
      table.decimal("duration_hours", 5, 2).notNullable();
      table.text("description").nullable();
      addTimestamps(table, knex);
      table.index(["user_id", "date"]);
      table.index(["task_id"]);
    });
  } else {
    await ensureColumn(knex, "work_entries", "duration_hours", (table) => table.decimal("duration_hours", 5, 2).notNullable().defaultTo(0));
    await ensureColumn(knex, "work_entries", "updated_at", (table) => table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "work_entries", "deleted_at", (table) => table.timestamp("deleted_at", { useTz: true }).nullable());
  }

  if (!(await knex.schema.hasTable("timer_state"))) {
    await knex.schema.createTable("timer_state", (table) => {
      table.increments("id").primary();
      table.integer("user_id").unsigned().notNullable().references("id").inTable("users").onDelete("RESTRICT");
      table.timestamp("start_time", { useTz: true }).notNullable();
      table.date("date").notNullable();
      table.integer("task_id").unsigned().nullable().references("id").inTable("tasks").onDelete("RESTRICT");
      table.enu("location", ["office", "client_site", "home"]).nullable();
      table.text("description").nullable();
      addTimestamps(table, knex);
      table.index(["user_id"]);
      table.index(["date"]);
    });
  } else {
    await ensureColumn(knex, "timer_state", "task_id", (table) => table.integer("task_id").unsigned().nullable().references("id").inTable("tasks").onDelete("RESTRICT"));
    await ensureColumn(knex, "timer_state", "location", (table) => table.enu("location", ["office", "client_site", "home"]).nullable());
    await ensureColumn(knex, "timer_state", "description", (table) => table.text("description").nullable());
    await ensureColumn(knex, "timer_state", "updated_at", (table) => table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "timer_state", "deleted_at", (table) => table.timestamp("deleted_at", { useTz: true }).nullable());
  }

  if (!(await knex.schema.hasTable("absence_entries"))) {
    await knex.schema.createTable("absence_entries", (table) => {
      table.increments("id").primary();
      table.integer("user_id").unsigned().notNullable().references("id").inTable("users").onDelete("RESTRICT");
      table.enu("type", ["vacation", "sick", "military_reserve", "other"]).notNullable();
      table.date("start_date").notNullable();
      table.date("end_date").notNullable();
      table.boolean("is_partial").notNullable().defaultTo(false);
      table.decimal("partial_hours", 4, 2).nullable();
      table.string("document_url", 500).nullable();
      table.timestamp("document_uploaded_at", { useTz: true }).nullable();
      table.text("notes").nullable();
      addTimestamps(table, knex);
      table.index(["user_id", "start_date", "end_date"]);
      table.index(["type"]);
    });
  } else {
    await ensureColumn(knex, "absence_entries", "partial_hours", (table) => table.decimal("partial_hours", 4, 2).nullable());
    await ensureColumn(knex, "absence_entries", "document_uploaded_at", (table) => table.timestamp("document_uploaded_at", { useTz: true }).nullable());
    await ensureColumn(knex, "absence_entries", "notes", (table) => table.text("notes").nullable());
    await ensureColumn(knex, "absence_entries", "updated_at", (table) => table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "absence_entries", "deleted_at", (table) => table.timestamp("deleted_at", { useTz: true }).nullable());
  }

  await knex.schema.raw("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_entries_time_order_check') THEN ALTER TABLE work_entries ADD CONSTRAINT work_entries_time_order_check CHECK (end_time > start_time); END IF; END $$");
  await knex.schema.raw("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_entries_duration_positive_check') THEN ALTER TABLE work_entries ADD CONSTRAINT work_entries_duration_positive_check CHECK (duration_hours >= 0 AND duration_hours <= 24); END IF; END $$");
  await knex.schema.raw("CREATE UNIQUE INDEX IF NOT EXISTS timer_state_one_active_per_user ON timer_state (user_id) WHERE deleted_at IS NULL");
  await knex.schema.raw("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'absence_entries_date_order_check') THEN ALTER TABLE absence_entries ADD CONSTRAINT absence_entries_date_order_check CHECK (end_date >= start_date); END IF; END $$");
  await knex.schema.raw("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'absence_entries_partial_hours_check') THEN ALTER TABLE absence_entries ADD CONSTRAINT absence_entries_partial_hours_check CHECK ((is_partial = false AND partial_hours IS NULL) OR (is_partial = true AND partial_hours > 0 AND partial_hours < 9)); END IF; END $$");
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("absence_entries");
  await knex.schema.dropTableIfExists("timer_state");
  await knex.schema.dropTableIfExists("work_entries");
};
