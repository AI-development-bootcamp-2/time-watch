'use strict'

const request = require('supertest')
const express = require('express')

jest.mock('../repositories/timerRepository')
const { findActiveTimer, createTimer, deleteTimer } = require('../repositories/timerRepository')

jest.mock('../db/knex', () => {
  const mockReturning = jest.fn()
  const mockInsert = jest.fn(() => ({ returning: mockReturning }))
  const mockKnex = jest.fn(() => ({ insert: mockInsert }))
  mockKnex.__mockReturning = mockReturning
  mockKnex.__mockInsert = mockInsert
  return mockKnex
})
const knex = require('../db/knex')

const timerRouter = require('./timer')

// Builds an express app with a fake-auth middleware that injects req.user from the X-Test-User header.
// Lets each test request authenticate as any user without needing real JWTs.
function buildApp() {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    const userId = Number(req.headers['x-test-user'])
    const role = req.headers['x-test-role'] || 'employee'
    if (Number.isInteger(userId) && userId > 0) {
      req.user = { id: userId, role }
    }
    next()
  })
  app.use('/api/timer', timerRouter)
  return app
}

const app = buildApp()

describe('GET /api/timer/status', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns 401 when no authenticated user', async () => {
    const res = await request(app).get('/api/timer/status')
    expect(res.status).toBe(401)
  })

  it('returns 200 with { timer: <row> } when an active timer exists for the authenticated user', async () => {
    const fakeTimer = {
      id: 42,
      user_id: 7,
      start_time: '2026-05-10T08:00:00.000Z',
      date: '2026-05-10',
      created_at: '2026-05-10T08:00:00.000Z',
    }
    findActiveTimer.mockResolvedValue(fakeTimer)

    const res = await request(app).get('/api/timer/status').set('X-Test-User', '7')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ timer: fakeTimer })
    expect(findActiveTimer).toHaveBeenCalledWith(7)
  })

  it('returns 200 with { timer: null } when no active timer exists', async () => {
    findActiveTimer.mockResolvedValue(undefined)

    const res = await request(app).get('/api/timer/status').set('X-Test-User', '7')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ timer: null })
    expect(findActiveTimer).toHaveBeenCalledWith(7)
  })

  it('scopes the timer lookup to the authenticated user — user B never sees user A timer', async () => {
    // findActiveTimer is mocked: it would only be called with the authenticated user's id.
    findActiveTimer.mockImplementation(async (uid) =>
      uid === 1 ? { id: 1, user_id: 1, start_time: '2026-05-10T08:00:00.000Z', date: '2026-05-10' } : undefined
    )

    const resA = await request(app).get('/api/timer/status').set('X-Test-User', '1')
    const resB = await request(app).get('/api/timer/status').set('X-Test-User', '2')

    expect(resA.body.timer).not.toBeNull()
    expect(resA.body.timer.user_id).toBe(1)
    expect(resB.body.timer).toBeNull()
    expect(findActiveTimer).toHaveBeenCalledWith(1)
    expect(findActiveTimer).toHaveBeenCalledWith(2)
  })

  it('returns 500 when the repository throws', async () => {
    findActiveTimer.mockRejectedValue(new Error('DB connection failed'))

    const res = await request(app).get('/api/timer/status').set('X-Test-User', '1')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})

describe('POST /api/timer/start', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns 401 when no authenticated user', async () => {
    const res = await request(app).post('/api/timer/start')
    expect(res.status).toBe(401)
  })

  it('returns 201 and starts the timer for the authenticated user only', async () => {
    const newTimer = {
      id: 7,
      user_id: 5,
      start_time: '2026-05-10T09:00:00.000Z',
      date: '2026-05-10',
      created_at: '2026-05-10T09:00:00.000Z',
    }
    findActiveTimer.mockResolvedValue(undefined)
    createTimer.mockResolvedValue(newTimer)

    const res = await request(app).post('/api/timer/start').set('X-Test-User', '5')

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ timer: newTimer })
    expect(findActiveTimer).toHaveBeenCalledWith(5)
    expect(createTimer).toHaveBeenCalledWith(5)
  })

  it('returns 409 and does not call createTimer when a timer is already active for that user', async () => {
    findActiveTimer.mockResolvedValue({
      id: 3,
      user_id: 5,
      start_time: '2026-05-10T08:00:00.000Z',
      date: '2026-05-10',
    })

    const res = await request(app).post('/api/timer/start').set('X-Test-User', '5')

    expect(res.status).toBe(409)
    expect(res.body).toEqual({ message: 'Timer already active' })
    expect(createTimer).not.toHaveBeenCalled()
  })

  it('user B can start a timer even if user A has one running — isolation by user_id', async () => {
    findActiveTimer.mockImplementation(async (uid) =>
      uid === 1 ? { id: 1, user_id: 1, start_time: '2026-05-10T08:00:00.000Z', date: '2026-05-10' } : undefined
    )
    const newTimer = { id: 9, user_id: 2, start_time: '2026-05-10T10:00:00.000Z', date: '2026-05-10' }
    createTimer.mockResolvedValue(newTimer)

    const res = await request(app).post('/api/timer/start').set('X-Test-User', '2')

    expect(res.status).toBe(201)
    expect(res.body.timer.user_id).toBe(2)
    expect(createTimer).toHaveBeenCalledWith(2)
  })

  it('returns 500 when findActiveTimer throws', async () => {
    findActiveTimer.mockRejectedValue(new Error('DB connection failed'))

    const res = await request(app).post('/api/timer/start').set('X-Test-User', '1')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})

describe('POST /api/timer/stop', () => {
  beforeEach(() => {
    // Restore the knex chain after jest.resetAllMocks() clears it.
    knex.__mockInsert.mockReturnValue({ returning: knex.__mockReturning })
    knex.mockReturnValue({ insert: knex.__mockInsert })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns 401 when no authenticated user', async () => {
    const res = await request(app)
      .post('/api/timer/stop')
      .send({ location: 'משרד' })
    expect(res.status).toBe(401)
  })

  it('returns 404 when no active timer exists for the authenticated user', async () => {
    findActiveTimer.mockResolvedValue(undefined)

    const res = await request(app)
      .post('/api/timer/stop')
      .set('X-Test-User', '3')
      .send({ task_id: 5, location: 'משרד' })

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'No active timer' })
    expect(findActiveTimer).toHaveBeenCalledWith(3)
  })

  it('returns 200 with a work entry that has user_id from the authenticated user', async () => {
    const fakeTimer = {
      id: 42,
      user_id: 8,
      start_time: '2026-05-10T08:00:00.000Z',
      date: '2026-05-10',
      created_at: '2026-05-10T08:00:00.000Z',
    }
    const fakeEntry = {
      id: 99,
      user_id: 8,
      task_id: 5,
      date: '2026-05-10',
      location: 'משרד',
      start_time: '08:00:00',
      end_time: '17:00:00',
      description: 'worked hard',
      created_at: '2026-05-10T17:00:00.000Z',
    }

    findActiveTimer.mockResolvedValue(fakeTimer)
    deleteTimer.mockResolvedValue()
    knex.__mockReturning.mockResolvedValue([fakeEntry])

    const res = await request(app)
      .post('/api/timer/stop')
      .set('X-Test-User', '8')
      .send({ task_id: 5, location: 'משרד', description: 'worked hard' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ entry: fakeEntry })
    expect(deleteTimer).toHaveBeenCalledWith(8)
    // Insert was called with user_id == authenticated user
    const insertArgs = knex.__mockInsert.mock.calls[0][0]
    expect(insertArgs.user_id).toBe(8)
  })

  it('returns 500 when findActiveTimer throws', async () => {
    findActiveTimer.mockRejectedValue(new Error('DB exploded'))

    const res = await request(app)
      .post('/api/timer/stop')
      .set('X-Test-User', '1')
      .send({ task_id: 5, location: 'משרד' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})
