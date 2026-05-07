const migration = require("./20260507130000_create_core_entity_tables.cjs");

function createChainableRecorder(operations) {
  let chain;

  chain = new Proxy(function noop() {}, {
    get(_target, prop) {
      if (prop === "then") {
        return undefined;
      }

      return (...args) => {
        operations.push({ method: prop, args });
        return chain;
      };
    }
  });

  return chain;
}

function createTableBuilder(operations) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        return (...args) => {
          operations.push({ method: prop, args });
          return createChainableRecorder(operations);
        };
      }
    }
  );
}

function createFakeKnex() {
  const createdTables = [];
  const droppedTables = [];
  const rawStatements = [];

  return {
    createdTables,
    droppedTables,
    rawStatements,
    fn: {
      now: () => "CURRENT_TIMESTAMP"
    },
    schema: {
      createTable: async (name, callback) => {
        const operations = [];
        callback(createTableBuilder(operations));
        createdTables.push({ name, operations });
      },
      dropTableIfExists: async (name) => {
        droppedTables.push(name);
      },
      raw: async (statement) => {
        rawStatements.push(statement);
      }
    }
  };
}

test("core entity migration creates all required tables in dependency order", async () => {
  const knex = createFakeKnex();

  await migration.up(knex);

  expect(knex.createdTables.map((table) => table.name)).toEqual([
    "users",
    "clients",
    "projects",
    "tasks",
    "user_tasks"
  ]);
  expect(knex.rawStatements).toEqual(
    expect.arrayContaining([
      expect.stringContaining("users_email_active_unique"),
      expect.stringContaining("clients_name_active_unique"),
      expect.stringContaining("projects_client_name_active_unique"),
      expect.stringContaining("tasks_project_name_active_unique"),
      expect.stringContaining("user_tasks_active_unique")
    ])
  );
});

test("core entity migration rolls back tables in reverse dependency order", async () => {
  const knex = createFakeKnex();

  await migration.down(knex);

  expect(knex.droppedTables).toEqual(["user_tasks", "tasks", "projects", "clients", "users"]);
});
