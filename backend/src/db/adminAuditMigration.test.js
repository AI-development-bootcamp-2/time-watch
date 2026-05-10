const migration = require("../../migrations/20260507132000_create_admin_audit_tables.cjs");

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

function createFakeKnex({ hasTable = false, hasColumn = false } = {}) {
  const createdTables = [];
  const alteredTables = [];
  const droppedTables = [];
  const rawStatements = [];

  return {
    createdTables,
    alteredTables,
    droppedTables,
    rawStatements,
    fn: {
      now: () => "CURRENT_TIMESTAMP"
    },
    schema: {
      hasTable: async () => hasTable,
      hasColumn: async () => hasColumn,
      createTable: async (name, callback) => {
        const operations = [];
        callback(createTableBuilder(operations));
        createdTables.push({ name, operations });
      },
      alterTable: async (name, callback) => {
        const operations = [];
        callback(createTableBuilder(operations));
        alteredTables.push({ name, operations });
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

function methodsFor(table) {
  return table.operations.map((operation) => operation.method);
}

function addedColumnsFor(tableName, knex) {
  return knex.alteredTables
    .filter((table) => table.name === tableName)
    .flatMap((table) => table.operations)
    .filter((operation) => ["integer", "timestamp", "text", "string", "jsonb"].includes(operation.method))
    .map((operation) => operation.args[0]);
}

test("admin audit migration creates month lock and audit tables", async () => {
  const knex = createFakeKnex();

  await migration.up(knex);

  expect(knex.createdTables.map((table) => table.name)).toEqual(["month_locks", "audit_log"]);
  expect(methodsFor(knex.createdTables[0])).toEqual(expect.arrayContaining(["integer", "timestamp", "text", "index"]));
  expect(methodsFor(knex.createdTables[1])).toEqual(expect.arrayContaining(["integer", "string", "jsonb", "timestamp"]));
});

test("admin audit migration adds uniqueness, checks, and audit indexes", async () => {
  const knex = createFakeKnex();

  await migration.up(knex);

  expect(knex.rawStatements).toEqual(
    expect.arrayContaining([
      expect.stringContaining("month_locks_year_month_unique"),
      expect.stringContaining("month_locks_month_range_check"),
      expect.stringContaining("month_locks_year_range_check"),
      expect.stringContaining("audit_log_actor_user_id_idx"),
      expect.stringContaining("audit_log_entity_idx")
    ])
  );
});

test("admin audit migration reconciles existing tables with missing columns", async () => {
  const knex = createFakeKnex({ hasTable: true, hasColumn: false });

  await migration.up(knex);

  expect(knex.createdTables).toEqual([]);
  expect(addedColumnsFor("month_locks", knex)).toEqual(
    expect.arrayContaining(["year", "month", "locked_by", "locked_at", "notes", "created_at", "updated_at"])
  );
  expect(addedColumnsFor("audit_log", knex)).toEqual(
    expect.arrayContaining([
      "actor_user_id",
      "target_user_id",
      "entity_type",
      "entity_id",
      "action",
      "old_values",
      "new_values",
      "metadata",
      "created_at",
      "updated_at"
    ])
  );
});

test("admin audit migration rolls back audit table before month locks", async () => {
  const knex = createFakeKnex();

  await migration.down(knex);

  expect(knex.droppedTables).toEqual(["audit_log", "month_locks"]);
});
