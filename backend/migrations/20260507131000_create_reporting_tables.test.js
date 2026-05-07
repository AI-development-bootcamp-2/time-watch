const migration = require("./20260507131000_create_reporting_tables.cjs");

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
      hasTable: async () => false,
      hasColumn: async () => false,
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

test("reporting migration creates work, timer, and absence tables", async () => {
  const knex = createFakeKnex();

  await migration.up(knex);

  expect(knex.createdTables.map((table) => table.name)).toEqual([
    "work_entries",
    "timer_state",
    "absence_entries"
  ]);
  expect(methodsFor(knex.createdTables[0])).toEqual(expect.arrayContaining(["date", "time", "decimal", "text"]));
  expect(methodsFor(knex.createdTables[1])).toEqual(expect.arrayContaining(["timestamp", "date", "enu"]));
  expect(methodsFor(knex.createdTables[2])).toEqual(expect.arrayContaining(["date", "boolean", "decimal", "string"]));
});

test("reporting migration adds database-level reporting constraints and active timer uniqueness", async () => {
  const knex = createFakeKnex();

  await migration.up(knex);

  expect(knex.rawStatements).toEqual(
    expect.arrayContaining([
      expect.stringContaining("work_entries_time_order_check"),
      expect.stringContaining("work_entries_duration_positive_check"),
      expect.stringContaining("timer_state_one_active_per_user"),
      expect.stringContaining("absence_entries_date_order_check"),
      expect.stringContaining("absence_entries_partial_hours_check")
    ])
  );
});

test("reporting migration rolls back tables in reverse dependency order", async () => {
  const knex = createFakeKnex();

  await migration.down(knex);

  expect(knex.droppedTables).toEqual(["absence_entries", "timer_state", "work_entries"]);
});
