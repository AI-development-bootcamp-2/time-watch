'use strict';

process.env.JWT_SECRET = 'test-secret-used-only-in-jest-at-least-32-chars!!';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../app');

const app = createApp();

function employeeCookie() {
  const token = jwt.sign(
    { sub: 'test-employee-id', role: 'employee' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `token=${token}`;
}

function adminCookie() {
  const token = jwt.sign(
    { sub: 'test-admin-id', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `token=${token}`;
}

describe('Admin-only route guards', () => {
  it('GET /api/clients — unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('GET /api/clients — employee JWT returns 403', async () => {
    const res = await request(app)
      .get('/api/clients')
      .set('Cookie', employeeCookie());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('1.22 — GET /api/clients — admin JWT passes the guard (not 401/403)', async () => {
    const res = await request(app)
      .get('/api/clients')
      .set('Cookie', adminCookie());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
