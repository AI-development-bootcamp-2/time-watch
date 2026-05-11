'use strict';

process.env.JWT_SECRET = 'test-secret-used-only-in-jest-at-least-32-chars!!';

const request = require('supertest');
const knex = require('knex');
const bcrypt = require('bcrypt');
const knexConfigs = require('../../knexfile.cjs');
const { createApp } = require('../app');
const { closeDatabase } = require('../db/knex');

let db;
let app;
let passwordHash;

const TEST_PASSWORD = 'Temp1234!';
const TEST_USER = {
  full_name: 'ישראל ישראלי',
  email: 'israel@example.com',
  role: 'employee',
  is_active: true,
};

beforeAll(async () => {
  db = knex(knexConfigs.test);
  await db.migrate.rollback(undefined, true);
  await db.migrate.latest();
  app = createApp();
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
    .insert({ ...TEST_USER, password_hash: passwordHash, ...overrides })
    .returning('*');
  return row;
}

describe('POST /api/auth/login', () => {
  it('200 — valid credentials set HttpOnly cookie and return safe user fields', async () => {
    await insertUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toMatch(/^token=/);
    expect(cookieStr).toMatch(/HttpOnly/i);

    expect(res.body).toHaveProperty('id');
    expect(res.body.full_name).toBe(TEST_USER.full_name);
    expect(res.body.email).toBe(TEST_USER.email);
    expect(res.body.role).toBe(TEST_USER.role);
    expect(res.body).not.toHaveProperty('password_hash');
    expect(res.body).not.toHaveProperty('failed_attempts');
    expect(res.body).not.toHaveProperty('locked_until');
  });

  it('400 — missing email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: TEST_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })])
    );
  });

  it('400 — missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'password' })])
    );
  });

  it('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: TEST_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })])
    );
  });

  it('401 — wrong password returns INVALID_CREDENTIALS', async () => {
    await insertUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('401 — unknown email returns same status and message as wrong password (anti-enumeration)', async () => {
    const wrongPasswordRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: TEST_PASSWORD });

    await insertUser();

    const wrongEmailRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: TEST_PASSWORD });

    expect(wrongEmailRes.status).toBe(401);
    expect(wrongEmailRes.body.code).toBe('INVALID_CREDENTIALS');
    expect(wrongEmailRes.body.message).toBe(wrongPasswordRes.body.message);
  });

  it('423 — locked account returns ACCOUNT_LOCKED with minutesRemaining in message', async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
    await insertUser({ locked_until: lockedUntil });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_PASSWORD });

    expect(res.status).toBe(423);
    expect(res.body.code).toBe('ACCOUNT_LOCKED');
    expect(res.body.message).toMatch(/\d+/);
  });
});
