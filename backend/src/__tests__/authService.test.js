'use strict';

process.env.JWT_SECRET = 'test-secret-for-auth-service-tests-at-least-32-chars!!';

const knex = require('knex');
const bcrypt = require('bcrypt');
const knexConfigs = require('../../knexfile.cjs');
const { login } = require('../services/authService');
const { closeDatabase } = require('../db/knex');
const { InvalidCredentialsError, AccountLockedError } = require('../utils/errors');

let db;
let passwordHash;

const TEST_PASSWORD = 'Temp1234!';
const userBase = {
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'employee',
  is_active: true,
};

beforeAll(async () => {
  db = knex(knexConfigs.test);
  await db.migrate.rollback(undefined, true);
  await db.migrate.latest();
  // cost 10 — fast enough for tests, real bcrypt comparison
  passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
});

afterEach(async () => {
  await db('users').delete();
});

afterAll(async () => {
  await db.migrate.rollback(undefined, true);
  await db.destroy();
  await closeDatabase();
});

async function insertUser(overrides = {}) {
  const [row] = await db('users')
    .insert({ ...userBase, password_hash: passwordHash, ...overrides })
    .returning('*');
  return row;
}

describe('authService.login', () => {
  it('returns { token, user } with no sensitive fields on valid credentials', async () => {
    await insertUser();
    const result = await login({ email: userBase.email, password: TEST_PASSWORD });

    expect(result).toHaveProperty('token');
    expect(typeof result.token).toBe('string');
    expect(result.user).not.toHaveProperty('password_hash');
    expect(result.user).not.toHaveProperty('failed_attempts');
    expect(result.user).not.toHaveProperty('locked_until');
    expect(result.user.email).toBe(userBase.email);
    expect(result.user.role).toBe('employee');
  });

  it('throws InvalidCredentialsError on wrong password', async () => {
    await insertUser();
    await expect(
      login({ email: userBase.email, password: 'WrongPass1!' })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError for unknown email (same error as wrong password)', async () => {
    await expect(
      login({ email: 'nobody@example.com', password: TEST_PASSWORD })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('throws AccountLockedError with minutesRemaining when account is locked', async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    await insertUser({ locked_until: lockedUntil });

    const err = await login({ email: userBase.email, password: TEST_PASSWORD }).catch(e => e);

    expect(err).toBeInstanceOf(AccountLockedError);
    expect(err.minutesRemaining).toBeGreaterThan(0);
    expect(err.minutesRemaining).toBeLessThanOrEqual(10);
  });

  it('sets locked_until after 3 consecutive wrong passwords', async () => {
    const user = await insertUser();

    for (let i = 0; i < 3; i++) {
      await login({ email: userBase.email, password: 'Wrong1!' }).catch(() => {});
    }

    const updated = await db('users').where({ id: user.id }).first();
    expect(updated.locked_until).not.toBeNull();
    expect(new Date(updated.locked_until).getTime()).toBeGreaterThan(Date.now());
  });

  it('resets failed_attempts to 0 on successful login', async () => {
    const user = await insertUser({ failed_attempts: 2 });

    await login({ email: userBase.email, password: TEST_PASSWORD });

    const updated = await db('users').where({ id: user.id }).first();
    expect(updated.failed_attempts).toBe(0);
  });
});
