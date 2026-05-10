'use strict'

const request = require('supertest')
const express = require('express')

jest.mock('../repositories/timerRepository')
const { findActiveTimer } = require('../repositories/timerRepository')

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
