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
  if (!(await knex.schema.hasTable("users"))) {
    await knex.schema.createTable("users", (table) => {
      table.increments("id").primary();
      table.string("full_name", 150).notNullable();
      table.string("email", 255).notNullable();
      table.string("password_hash", 255).notNullable();
      table.enu("role", ["employee", "project_manager", "admin"]).notNullable().defaultTo("employee");
      table.boolean("is_active").notNullable().defaultTo(true);
      table.integer("failed_attempts").notNullable().defaultTo(0);
      table.timestamp("locked_until", { useTz: true }).nullable();
      table.timestamp("last_login_at", { useTz: true }).nullable();
      addTimestamps(table, knex);
    });
  } else {
    await ensureColumn(knex, "users", "is_active", (table) => table.boolean("is_active").notNullable().defaultTo(true));
    await ensureColumn(knex, "users", "locked_until", (table) => table.timestamp("locked_until", { useTz: true }).nullable());
    await ensureColumn(knex, "users", "last_login_at", (table) => table.timestamp("last_login_at", { useTz: true }).nullable());
    await ensureColumn(knex, "users", "created_at", (table) => table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "users", "updated_at", (table) => table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "users", "deleted_at", (table) => table.timestamp("deleted_at", { useTz: true }).nullable());
  }

  if (!(await knex.schema.hasTable("clients"))) {
    await knex.schema.createTable("clients", (table) => {
      table.increments("id").primary();
      table.string("name", 150).notNullable();
      table.string("contact", 255).nullable();
      table.boolean("is_active").notNullable().defaultTo(true);
      addTimestamps(table, knex);
    });
  } else {
    await ensureColumn(knex, "clients", "contact", (table) => table.string("contact", 255).nullable());
    await ensureColumn(knex, "clients", "is_active", (table) => table.boolean("is_active").notNullable().defaultTo(true));
    await ensureColumn(knex, "clients", "created_at", (table) => table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "clients", "updated_at", (table) => table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "clients", "deleted_at", (table) => table.timestamp("deleted_at", { useTz: true }).nullable());
  }

  if (!(await knex.schema.hasTable("projects"))) {
    await knex.schema.createTable("projects", (table) => {
      table.increments("id").primary();
      table.integer("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("RESTRICT");
      table.string("name", 150).notNullable();
      table.boolean("is_active").notNullable().defaultTo(true);
      addTimestamps(table, knex);
      table.index(["client_id"]);
    });
  } else {
    await ensureColumn(knex, "projects", "is_active", (table) => table.boolean("is_active").notNullable().defaultTo(true));
    await ensureColumn(knex, "projects", "created_at", (table) => table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "projects", "updated_at", (table) => table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "projects", "deleted_at", (table) => table.timestamp("deleted_at", { useTz: true }).nullable());
  }

  if (!(await knex.schema.hasTable("tasks"))) {
    await knex.schema.createTable("tasks", (table) => {
      table.increments("id").primary();
      table.integer("project_id").unsigned().notNullable().references("id").inTable("projects").onDelete("RESTRICT");
      table.string("name", 150).notNullable();
      table.enu("status", ["open", "closed"]).notNullable().defaultTo("open");
      addTimestamps(table, knex);
      table.index(["project_id"]);
    });
  } else {
    await ensureColumn(knex, "tasks", "created_at", (table) => table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "tasks", "updated_at", (table) => table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "tasks", "deleted_at", (table) => table.timestamp("deleted_at", { useTz: true }).nullable());
  }

  if (!(await knex.schema.hasTable("user_tasks"))) {
    await knex.schema.createTable("user_tasks", (table) => {
      table.integer("user_id").unsigned().notNullable().references("id").inTable("users").onDelete("RESTRICT");
      table.integer("task_id").unsigned().notNullable().references("id").inTable("tasks").onDelete("RESTRICT");
      table.timestamp("assigned_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("deleted_at", { useTz: true }).nullable();
      table.primary(["user_id", "task_id"]);
      table.index(["user_id"]);
      table.index(["task_id"]);
    });
  } else {
    await ensureColumn(knex, "user_tasks", "assigned_at", (table) => table.timestamp("assigned_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "user_tasks", "updated_at", (table) => table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now()));
    await ensureColumn(knex, "user_tasks", "deleted_at", (table) => table.timestamp("deleted_at", { useTz: true }).nullable());
  }

  await knex.schema.raw("CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_unique ON users (LOWER(email)) WHERE deleted_at IS NULL");
  await knex.schema.raw("CREATE UNIQUE INDEX IF NOT EXISTS clients_name_active_unique ON clients (LOWER(name)) WHERE deleted_at IS NULL");
  await knex.schema.raw("CREATE UNIQUE INDEX IF NOT EXISTS projects_client_name_active_unique ON projects (client_id, LOWER(name)) WHERE deleted_at IS NULL");
  await knex.schema.raw("CREATE UNIQUE INDEX IF NOT EXISTS tasks_project_name_active_unique ON tasks (project_id, LOWER(name)) WHERE deleted_at IS NULL");
  await knex.schema.raw("CREATE UNIQUE INDEX IF NOT EXISTS user_tasks_active_unique ON user_tasks (user_id, task_id) WHERE deleted_at IS NULL");
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("user_tasks");
  await knex.schema.dropTableIfExists("tasks");
  await knex.schema.dropTableIfExists("projects");
  await knex.schema.dropTableIfExists("clients");
  await knex.schema.dropTableIfExists("users");
};
