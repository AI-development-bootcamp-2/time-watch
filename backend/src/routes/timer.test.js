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

const app = express()
app.use(express.json())
app.use('/api/timer', timerRouter)

describe('GET /api/timer/status', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns 200 with { timer: <row> } when an active timer exists', async () => {
    const fakeTimer = {
      id: 42,
      user_id: 1,
      start_time: '2026-05-10T08:00:00.000Z',
      date: '2026-05-10',
      created_at: '2026-05-10T08:00:00.000Z',
    }
    findActiveTimer.mockResolvedValue(fakeTimer)

    const res = await request(app).get('/api/timer/status')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ timer: fakeTimer })
    expect(findActiveTimer).toHaveBeenCalledWith(1)
  })

  it('returns 200 with { timer: null } when no active timer exists', async () => {
    findActiveTimer.mockResolvedValue(undefined)

    const res = await request(app).get('/api/timer/status')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ timer: null })
    expect(findActiveTimer).toHaveBeenCalledWith(1)
  })

  it('returns 500 when the repository throws', async () => {
    findActiveTimer.mockRejectedValue(new Error('DB connection failed'))

    const res = await request(app).get('/api/timer/status')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})

describe('POST /api/timer/start', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns 201 with { timer: <new row> } when no active timer exists', async () => {
    const newTimer = {
      id: 7,
      user_id: 1,
      start_time: '2026-05-10T09:00:00.000Z',
      date: '2026-05-10',
      created_at: '2026-05-10T09:00:00.000Z',
    }
    findActiveTimer.mockResolvedValue(undefined)
    createTimer.mockResolvedValue(newTimer)

    const res = await request(app).post('/api/timer/start')

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ timer: newTimer })
    expect(findActiveTimer).toHaveBeenCalledWith(1)
    expect(createTimer).toHaveBeenCalledWith(1)
  })

  it('returns 409 and does not call createTimer when a timer is already active', async () => {
    const existingTimer = {
      id: 3,
      user_id: 1,
      start_time: '2026-05-10T08:00:00.000Z',
      date: '2026-05-10',
      created_at: '2026-05-10T08:00:00.000Z',
    }
    findActiveTimer.mockResolvedValue(existingTimer)

    const res = await request(app).post('/api/timer/start')

    expect(res.status).toBe(409)
    expect(res.body).toEqual({ message: 'Timer already active' })
    expect(createTimer).not.toHaveBeenCalled()
  })

  it('returns 500 when findActiveTimer throws', async () => {
    findActiveTimer.mockRejectedValue(new Error('DB connection failed'))

    const res = await request(app).post('/api/timer/start')

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

  it('returns 400 when task_id is missing', async () => {
    const res = await request(app)
      .post('/api/timer/stop')
      .send({ location: 'משרד' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'task_id and location are required' })
  })

  it('returns 400 when location is missing', async () => {
    const res = await request(app)
      .post('/api/timer/stop')
      .send({ task_id: 5 })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'task_id and location are required' })
  })

  it('returns 404 when no active timer exists', async () => {
    findActiveTimer.mockResolvedValue(undefined)

    const res = await request(app)
      .post('/api/timer/stop')
      .send({ task_id: 5, location: 'משרד' })

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'No active timer' })
  })

  it('returns 200 with the new work entry and calls deleteTimer on happy path', async () => {
    const fakeTimer = {
      id: 42,
      user_id: 1,
      start_time: '2026-05-10T08:00:00.000Z',
      date: '2026-05-10',
      created_at: '2026-05-10T08:00:00.000Z',
    }
    const fakeEntry = {
      id: 99,
      user_id: 1,
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
      .send({ task_id: 5, location: 'משרד', description: 'worked hard' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ entry: fakeEntry })
    expect(deleteTimer).toHaveBeenCalledWith(1)
  })

  it('returns 500 when findActiveTimer throws', async () => {
    findActiveTimer.mockRejectedValue(new Error('DB exploded'))

    const res = await request(app)
      .post('/api/timer/stop')
      .send({ task_id: 5, location: 'משרד' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})
