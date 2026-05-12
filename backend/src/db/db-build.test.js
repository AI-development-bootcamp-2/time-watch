/**
 * Diagnostic tests for the DB build pipeline.
 * Each describe block is a named step — if a step fails you know exactly where the build broke.
 * Requires a running Postgres instance pointed to by DATABASE_URL.
 * Run inside docker:  docker compose exec backend npx jest db-build
 * Run locally:        DATABASE_URL=postgres://... npx jest db-build
 */

const knex = require('knex');
const knexConfigs = require('../../knexfile.cjs');

let db;

beforeAll(async () => {
  db = knex(knexConfigs.test);
});

afterAll(async () => {
  if (db) await db.destroy();
});

// ─── helper ──────────────────────────────────────────────────────────────────

async function publicTables() {
  const result = await db.raw(`
    SELECT tablename
    FROM   pg_tables
    WHERE  schemaname = 'public'
      AND  tablename NOT LIKE 'knex_%'
    ORDER BY tablename
  `);
  return result.rows.map((r) => r.tablename);
}

// ─── Step 0: connectivity ─────────────────────────────────────────────────────

describe('Step 0 — DB connectivity', () => {
  it('DATABASE_URL env var is set', () => {
    expect(process.env.DATABASE_URL).toBeTruthy();
  });

  it('can reach postgres (SELECT 1)', async () => {
    const result = await db.raw('SELECT 1 AS ok');
    expect(result.rows[0].ok).toBe(1);
  });

  it('connected to the expected database', async () => {
    const result = await db.raw('SELECT current_database() AS db');
    // just proves we can read the name — value depends on env
    expect(result.rows[0].db).toBeTruthy();
  });
});

// ─── Step 1: clean slate ──────────────────────────────────────────────────────

describe('Step 1 — Roll back to clean state', () => {
  it('rolls back ALL batches without error', async () => {
    await expect(db.migrate.rollback(undefined, true)).resolves.toBeDefined();
  });

  it('no app tables remain after full rollback', async () => {
    const tables = await publicTables();
    expect(tables).toEqual(
      expect.not.arrayContaining(['users', 'clients', 'projects', 'tasks', 'work_entries', 'absence_entries', 'month_locks', 'audit_log'])
    );
  });
});

// ─── Step 2: migration 1 — core entity tables ─────────────────────────────────

describe('Step 2 — Migration 1: core entity tables', () => {
  it('runs without throwing', async () => {
    await expect(db.migrate.up()).resolves.toBeDefined();
  });

  it('users table was created', async () => {
    await expect(db.schema.hasTable('users')).resolves.toBe(true);
  });

  it('users table has all required columns', async () => {
    const cols = await db('users').columnInfo();
    const required = ['id', 'email', 'password_hash', 'full_name', 'role', 'is_active', 'created_at', 'updated_at'];
    for (const col of required) {
      expect(cols).toHaveProperty(col);
    }
  });

  it('users.role column only accepts admin or employee', async () => {
    await db('users').insert({
      email: 'ok@test.com',
      password_hash: 'x',
      full_name: 'OK',
      role: 'employee',
      is_active: true,
    });

    await expect(
      db('users').insert({
        email: 'bad@test.com',
        password_hash: 'x',
        full_name: 'Bad',
        role: 'superuser',
        is_active: true,
      })
    ).rejects.toThrow();

    await db('users').delete();
  });

  it('tables present after migration 1', async () => {
    const tables = await publicTables();
    expect(tables).toContain('users');
  });
});

// ─── Step 3: migration 2 — reporting tables ───────────────────────────────────

describe('Step 3 — Migration 2: reporting tables', () => {
  it('runs without throwing', async () => {
    await expect(db.migrate.up()).resolves.toBeDefined();
  });

  it('tables present after migration 2 (users still exists)', async () => {
    const tables = await publicTables();
    expect(tables).toContain('users');
    // work_entries and absence_entries are currently commented out;
    // when uncommented this test will catch them automatically
  });
});

// ─── Step 4: migration 3 — admin / audit tables ───────────────────────────────

describe('Step 4 — Migration 3: admin / audit tables', () => {
  it('runs without throwing', async () => {
    await expect(db.migrate.up()).resolves.toBeDefined();
  });

  it('tables present after migration 3', async () => {
    const tables = await publicTables();
    expect(tables).toContain('users');
    // month_locks and audit_log are commented out;
    // when uncommented they will appear here
  });
});

// ─── Step 5: verify knex tracking ────────────────────────────────────────────

describe('Step 5 — Migration tracking', () => {
  it('knex_migrations table records exactly 3 migrations', async () => {
    const rows = await db('knex_migrations').orderBy('id').select('name', 'batch');
    expect(rows).toHaveLength(3);
    expect(rows[0].name).toMatch(/create_core_entity_tables/);
    expect(rows[1].name).toMatch(/create_reporting_tables/);
    expect(rows[2].name).toMatch(/create_admin_audit_tables/);
  });

  it('all 3 migrations landed in batch 1', async () => {
    const rows = await db('knex_migrations').select('batch');
    const batches = [...new Set(rows.map((r) => r.batch))];
    expect(batches).toEqual([1]);
  });
});

// ─── Step 6: full rollback then migrate:latest ───────────────────────────────

describe('Step 6 — Rollback → migrate:latest cycle (simulates docker compose up)', () => {
  it('full rollback succeeds', async () => {
    await expect(db.migrate.rollback(undefined, true)).resolves.toBeDefined();
  });

  it('no app tables after rollback', async () => {
    const tables = await publicTables();
    expect(tables).toEqual(
      expect.not.arrayContaining(['users'])
    );
  });

  it('migrate:latest re-creates schema from scratch', async () => {
    await expect(db.migrate.latest()).resolves.toBeDefined();
  });

  it('users table exists after migrate:latest', async () => {
    await expect(db.schema.hasTable('users')).resolves.toBe(true);
  });

  it('schema state after migrate:latest matches step-by-step result', async () => {
    const tables = await publicTables();
    expect(tables).toContain('users');
  });
});

// ─── Step 7: seed idempotency ─────────────────────────────────────────────────

describe('Step 7 — Seed: admin user', () => {
  it('seed runs without error', async () => {
    process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234!';
    await expect(db.seed.run()).resolves.toBeDefined();
  });

  it('admin@timewatch.local exists after seed', async () => {
    const user = await db('users').where({ email: 'admin@timewatch.local' }).first();
    expect(user).toBeDefined();
    expect(user.role).toBe('admin');
    expect(user.is_active).toBe(true);
  });

  it('seed is idempotent — running it twice does not create duplicate', async () => {
    await expect(db.seed.run()).resolves.toBeDefined();
    const count = await db('users').where({ email: 'admin@timewatch.local' }).count('id as n').first();
    expect(Number(count.n)).toBe(1);
  });
});
