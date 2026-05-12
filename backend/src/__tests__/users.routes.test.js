'use strict';

// Must be set before any module that reads JWT_SECRET is required.
process.env.JWT_SECRET = 'test-secret-used-only-in-jest-at-least-32-chars!!';

const request = require('supertest');
const knex = require('knex');
const knexConfigs = require('../../knexfile.cjs');
const { createApp } = require('../app');
const { closeDatabase } = require('../db/knex');
const { adminCookie, employeeCookie } = require('./helpers/cookies');

let db;
let app;

const validBody = {
  full_name: 'ישראל ישראלי',
  email: 'israel@example.com',
  password: 'Temp1234!',
  role: 'employee',
};

beforeAll(async () => {
  db = knex(knexConfigs.test);
  await db.migrate.rollback(undefined, true);
  await db.migrate.latest();
  app = createApp();
});

afterEach(async () => {
  await db('users').delete();
});

afterAll(async () => {
  await db.migrate.rollback(undefined, true);
  await db.destroy();
  await closeDatabase(); // close the module-level singleton used by the app
});

describe('POST /api/users', () => {
  it('201 — creates user and excludes password_hash from response', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', adminCookie())
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.email).toBe(validBody.email);
    expect(res.body.role).toBe('employee');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('401 — no auth cookie', async () => {
    const res = await request(app).post('/api/users').send(validBody);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('403 — authenticated as employee (non-admin)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', employeeCookie())
      .send(validBody);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('409 — duplicate email', async () => {
    await request(app).post('/api/users').set('Cookie', adminCookie()).send(validBody);
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', adminCookie())
      .send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  // Validation: required fields
  it('400 — missing full_name', async () => {
    const { full_name, ...body } = validBody;
    const res = await request(app).post('/api/users').set('Cookie', adminCookie()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'full_name' })]));
  });

  it('400 — missing email', async () => {
    const { email, ...body } = validBody;
    const res = await request(app).post('/api/users').set('Cookie', adminCookie()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'email' })]));
  });

  it('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', adminCookie())
      .send({ ...validBody, email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'email' })]));
  });

  it('400 — invalid role', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', adminCookie())
      .send({ ...validBody, role: 'superuser' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'role' })]));
  });

  // Password complexity
  it('400 — password too short', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', adminCookie())
      .send({ ...validBody, password: 'Ab1!' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'password' })]));
  });

  it('400 — password missing uppercase', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', adminCookie())
      .send({ ...validBody, password: 'temp1234!' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'password' })]));
  });

  it('400 — password missing lowercase', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', adminCookie())
      .send({ ...validBody, password: 'TEMP1234!' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'password' })]));
  });

  it('400 — password missing digit', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', adminCookie())
      .send({ ...validBody, password: 'TempTemp!' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'password' })]));
  });

  it('400 — password missing special character', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', adminCookie())
      .send({ ...validBody, password: 'Temp12345' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'password' })]));
  });
});
