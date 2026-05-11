const knex = require('knex');
const knexConfigs = require('../../knexfile.cjs');

let db;

beforeAll(async () => {
  db = knex(knexConfigs.test);
  await db.migrate.rollback(undefined, true);
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback();
  await db.destroy();
});

describe('users table', () => {
  it('exists after migration', async () => {
    const exists = await db.schema.hasTable('users');
    expect(exists).toBe(true);
  });

  it('has the expected columns', async () => {
    const cols = await db('users').columnInfo();
    expect(cols).toHaveProperty('id');
    expect(cols).toHaveProperty('email');
    expect(cols).toHaveProperty('password_hash');
    expect(cols).toHaveProperty('full_name');
    expect(cols).toHaveProperty('role');
    expect(cols).toHaveProperty('is_active');
    expect(cols).toHaveProperty('created_at');
    expect(cols).toHaveProperty('updated_at');
  });

  it('inserts and retrieves a user', async () => {
    const [{ id }] = await db('users').insert({
      email: 'test@example.com',
      password_hash: 'hashed',
      full_name: 'Test User',
      role: 'employee',
      is_active: true,
    }).returning('id');

    const user = await db('users').where({ id }).first();
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('employee');
    expect(user.is_active).toBe(true);
  });

  it('enforces unique email constraint', async () => {
    await db('users').insert({
      email: 'unique@example.com',
      password_hash: 'hashed',
      full_name: 'First',
      role: 'employee',
      is_active: true,
    });

    await expect(
      db('users').insert({
        email: 'unique@example.com',
        password_hash: 'hashed',
        full_name: 'Second',
        role: 'employee',
        is_active: true,
      })
    ).rejects.toThrow();
  });
});
