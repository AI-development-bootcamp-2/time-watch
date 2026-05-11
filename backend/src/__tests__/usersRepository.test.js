'use strict';

const knex = require('knex');
const knexConfigs = require('../../knexfile.cjs');
const { findByEmail, create } = require('../repositories/usersRepository');
const { closeDatabase } = require('../db/knex');

let db;

beforeAll(async () => {
  db = knex(knexConfigs.test);
  await db.migrate.rollback(undefined, true);
  await db.migrate.latest();
});

afterEach(async () => {
  await db('users').delete();
});

afterAll(async () => {
  await db.migrate.rollback(undefined, true);
  await db.destroy();
  await closeDatabase(); // close the module-level singleton used by the repository
});

const sample = {
  full_name: 'ישראל ישראלי',
  email: 'israel@example.com',
  password_hash: '$2b$12$hashedpassword',
  role: 'employee',
};

describe('usersRepository.create', () => {
  it('inserts a user and returns safe columns (no password_hash)', async () => {
    const user = await create(sample);
    expect(user.email).toBe(sample.email);
    expect(user.full_name).toBe(sample.full_name);
    expect(user.role).toBe('employee');
    expect(user.is_active).toBe(true);
    expect(user).not.toHaveProperty('password_hash');
  });

  it('throws pg error 23505 on duplicate email', async () => {
    await create(sample);
    await expect(create(sample)).rejects.toMatchObject({ code: '23505' });
  });
});

describe('usersRepository.findByEmail', () => {
  it('returns the user row including password_hash', async () => {
    await create(sample);
    const found = await findByEmail(sample.email);
    expect(found.email).toBe(sample.email);
    expect(found).toHaveProperty('password_hash');
  });

  it('is case-insensitive', async () => {
    await create(sample);
    const found = await findByEmail('ISRAEL@EXAMPLE.COM');
    expect(found).toBeDefined();
    expect(found.email).toBe(sample.email);
  });

  it('returns undefined for a soft-deleted user', async () => {
    const inserted = await db('users')
      .insert({ ...sample, deleted_at: new Date() })
      .returning('id');
    const found = await findByEmail(sample.email);
    expect(found).toBeUndefined();
  });
});
