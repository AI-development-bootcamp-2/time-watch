'use strict';

process.env.JWT_SECRET = 'test-secret-used-only-in-jest-at-least-32-chars!!';

const request = require('supertest');
const { createApp } = require('../app');
const { adminCookie, employeeCookie, projectManagerCookie } = require('../__tests__/helpers/cookies');

const app = createApp();

describe('GET /api/user-tasks — auth guards', () => {
  it('unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/user-tasks');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('employee JWT returns 403', async () => {
    const res = await request(app)
      .get('/api/user-tasks')
      .set('Cookie', employeeCookie());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('admin JWT passes the guard (not 401/403)', async () => {
    const res = await request(app)
      .get('/api/user-tasks')
      .set('Cookie', adminCookie());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400); // guard passed; missing query param
  });

  it('project_manager JWT passes the guard (not 401/403)', async () => {
    const res = await request(app)
      .get('/api/user-tasks')
      .set('Cookie', projectManagerCookie());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400); // guard passed; missing query param
  });
});

describe('POST /api/user-tasks — auth guards', () => {
  it('unauthenticated request returns 401', async () => {
    const res = await request(app).post('/api/user-tasks');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('employee JWT returns 403', async () => {
    const res = await request(app)
      .post('/api/user-tasks')
      .set('Cookie', employeeCookie());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('admin JWT passes the guard (not 401/403)', async () => {
    const res = await request(app)
      .post('/api/user-tasks')
      .set('Cookie', adminCookie())
      .send({});
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('project_manager JWT passes the guard (not 401/403)', async () => {
    const res = await request(app)
      .post('/api/user-tasks')
      .set('Cookie', projectManagerCookie())
      .send({});
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe('DELETE /api/user-tasks — auth guards', () => {
  it('unauthenticated request returns 401', async () => {
    const res = await request(app).delete('/api/user-tasks');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('employee JWT returns 403', async () => {
    const res = await request(app)
      .delete('/api/user-tasks')
      .set('Cookie', employeeCookie());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('POST /api/user-tasks — business logic', () => {
  it.todo('valid body as admin returns 201 with the new assignment');
  it.todo('missing user_id returns 400');
  it.todo('missing task_id returns 400');
  it.todo('duplicate active assignment returns 409');
  it.todo('re-assigning after soft-delete returns 201 and restores the row');
});

describe('DELETE /api/user-tasks — business logic', () => {
  it.todo('valid body returns 200 and soft-deletes the assignment');
  it.todo('non-existent assignment returns 404');
});

describe('GET /api/user-tasks — business logic', () => {
  it.todo('?user_id=X returns 200 with array of assignments for that user');
  it.todo('?task_id=X returns 200 with array of assignments for that task');
  it.todo('request without query params returns 400');
});
