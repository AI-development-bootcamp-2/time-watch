'use strict'

const request = require('supertest')
const express = require('express')

// Mock the repository module before requiring the router
jest.mock('../repositories/workEntryRepository')
const {
  getMonthlyEntries,
  getMonthlyAbsences,
} = require('../repositories/workEntryRepository')

const workEntriesRouter = require('./workEntries')

// Builds an express app with a fake-auth middleware that reads req.user from headers.
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
  app.use('/api/work-entries', workEntriesRouter)
  return app
}

const app = buildApp()

describe('GET /api/work-entries', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns 401 when no authenticated user', async () => {
    const res = await request(app).get('/api/work-entries?month=2025-05')
    expect(res.status).toBe(401)
  })

  it('returns 400 when month param is missing', async () => {
    const res = await request(app).get('/api/work-entries').set('X-Test-User', '1')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'month query parameter is required' })
  })

  it('returns 400 when month is not in YYYY-MM format', async () => {
    const res = await request(app).get('/api/work-entries?month=05-2025').set('X-Test-User', '1')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'month must be in YYYY-MM format' })
  })

  it('returns 400 when month is a full date string', async () => {
    const res = await request(app).get('/api/work-entries?month=2025-05-01').set('X-Test-User', '1')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'month must be in YYYY-MM format' })
  })

  it('returns 200 with correct structure for a valid month (no data)', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05').set('X-Test-User', '7')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('month', '2025-05')
    expect(res.body).toHaveProperty('userId', 7)
    expect(res.body).toHaveProperty('days')
    expect(Array.isArray(res.body.days)).toBe(true)
    expect(res.body.days).toHaveLength(31) // May has 31 days
  })

  it('returns correct day shape in days array', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05').set('X-Test-User', '1')

    const day = res.body.days[0]
    expect(day).toHaveProperty('date', '2025-05-01')
    expect(day).toHaveProperty('status')
    expect(day).toHaveProperty('totalHours')
    expect(day).toHaveProperty('entries')
    expect(day).toHaveProperty('absence')
    expect(Array.isArray(day.entries)).toBe(true)
    expect(day.absence).toBeNull()
  })

  it('uses the authenticated user id when userId param is omitted', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05').set('X-Test-User', '42')

    expect(getMonthlyEntries).toHaveBeenCalledWith(42, '2025-05')
    expect(getMonthlyAbsences).toHaveBeenCalledWith(42, '2025-05')
    expect(res.body.userId).toBe(42)
  })

  it('uses the authenticated user id when userId param is "me"', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05&userId=me').set('X-Test-User', '42')

    expect(getMonthlyEntries).toHaveBeenCalledWith(42, '2025-05')
    expect(res.body.userId).toBe(42)
  })

  it('returns 403 when an employee requests another user\'s data via userId param', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05&userId=99').set('X-Test-User', '1')

    expect(res.status).toBe(403)
    expect(getMonthlyEntries).not.toHaveBeenCalled()
  })

  it('isolates data: user A and user B receive only their own entries', async () => {
    // Repository returns different rows depending on which userId is queried — verifies the
    // route never bleeds another user's data into the response.
    getMonthlyEntries.mockImplementation(async (uid) =>
      uid === 1
        ? [{ date: '2025-05-05', start_time: '09:00:00', end_time: '18:00:00' }]
        : []
    )
    getMonthlyAbsences.mockResolvedValue([])

    const resA = await request(app).get('/api/work-entries?month=2025-05').set('X-Test-User', '1')
    const resB = await request(app).get('/api/work-entries?month=2025-05').set('X-Test-User', '2')

    const dayA = resA.body.days.find(d => d.date === '2025-05-05')
    const dayB = resB.body.days.find(d => d.date === '2025-05-05')
    expect(dayA.entries.length).toBe(1)
    expect(dayB.entries.length).toBe(0)
    expect(resA.body.userId).toBe(1)
    expect(resB.body.userId).toBe(2)
  })

  it('allows an admin to query another user\'s data via userId param', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app)
      .get('/api/work-entries?month=2025-05&userId=99')
      .set('X-Test-User', '1')
      .set('X-Test-Role', 'admin')

    expect(res.status).toBe(200)
    expect(getMonthlyEntries).toHaveBeenCalledWith(99, '2025-05')
    expect(res.body.userId).toBe(99)
  })

  it('assigns correct status to days with entries', async () => {
    // 2025-05-05 is a Monday
    getMonthlyEntries.mockResolvedValue([
      {
        date: '2025-05-05',
        start_time: '09:00:00',
        end_time: '18:00:00', // 9h → full
      },
    ])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05').set('X-Test-User', '1')

    const day5 = res.body.days.find(d => d.date === '2025-05-05')
    expect(day5.status).toBe('full')
    expect(day5.totalHours).toBe(9)
    expect(day5.entries).toHaveLength(1)
  })

  it('marks weekends correctly', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05').set('X-Test-User', '1')

    // 2025-05-02 is Friday, 2025-05-03 is Saturday
    const friday = res.body.days.find(d => d.date === '2025-05-02')
    const saturday = res.body.days.find(d => d.date === '2025-05-03')
    expect(friday.status).toBe('weekend')
    expect(saturday.status).toBe('weekend')
  })

  it('returns 500 when repository throws', async () => {
    getMonthlyEntries.mockRejectedValue(new Error('DB exploded'))

    const res = await request(app).get('/api/work-entries?month=2025-05').set('X-Test-User', '1')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})
