function addTimestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("deleted_at", { useTz: true }).nullable();
}

exports.up = async function up(knex) {
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("full_name", 150).notNullable();
    table.string("email", 255).notNullable();
    table.string("password_hash", 255).notNullable();
    table.enu("role", ["employee", "project_manager", "admin"]).notNullable().defaultTo("employee");
    table.integer("failed_attempts").notNullable().defaultTo(0);
    table.timestamp("locked_until", { useTz: true }).nullable();
    table.timestamp("last_login_at", { useTz: true }).nullable();
    addTimestamps(table, knex);
  });

  await knex.schema.createTable("clients", (table) => {
    table.increments("id").primary();
    table.string("name", 150).notNullable();
    table.string("contact_name", 150).nullable();
    table.string("contact_email", 255).nullable();
    table.string("contact_phone", 50).nullable();
    addTimestamps(table, knex);
  });

  await knex.schema.createTable("projects", (table) => {
    table.increments("id").primary();
    table.integer("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("RESTRICT");
    table.string("name", 150).notNullable();
    addTimestamps(table, knex);
    table.index(["client_id"]);
  });

  await knex.schema.createTable("tasks", (table) => {
    table.increments("id").primary();
    table.integer("project_id").unsigned().notNullable().references("id").inTable("projects").onDelete("RESTRICT");
    table.string("name", 150).notNullable();
    table.enu("status", ["open", "closed"]).notNullable().defaultTo("open");
    addTimestamps(table, knex);
    table.index(["project_id"]);
  });

  await knex.schema.createTable("user_tasks", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.integer("task_id").unsigned().notNullable().references("id").inTable("tasks").onDelete("RESTRICT");
    table.timestamp("assigned_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    addTimestamps(table, knex);
    table.index(["user_id"]);
    table.index(["task_id"]);
  });

  await knex.schema.raw("CREATE UNIQUE INDEX users_email_active_unique ON users (LOWER(email)) WHERE deleted_at IS NULL");
  await knex.schema.raw("CREATE UNIQUE INDEX clients_name_active_unique ON clients (LOWER(name)) WHERE deleted_at IS NULL");
  await knex.schema.raw("CREATE UNIQUE INDEX projects_client_name_active_unique ON projects (client_id, LOWER(name)) WHERE deleted_at IS NULL");
  await knex.schema.raw("CREATE UNIQUE INDEX tasks_project_name_active_unique ON tasks (project_id, LOWER(name)) WHERE deleted_at IS NULL");
  await knex.schema.raw("CREATE UNIQUE INDEX user_tasks_active_unique ON user_tasks (user_id, task_id) WHERE deleted_at IS NULL");
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("user_tasks");
  await knex.schema.dropTableIfExists("tasks");
  await knex.schema.dropTableIfExists("projects");
  await knex.schema.dropTableIfExists("clients");
  await knex.schema.dropTableIfExists("users");
};
