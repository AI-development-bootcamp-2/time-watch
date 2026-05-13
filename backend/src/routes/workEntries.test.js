'use strict'

const request = require('supertest')
const express = require('express')

// Mock the repository module before requiring the router
jest.mock('../repositories/workEntryRepository')
const {
  getMonthlyEntries,
  getMonthlyAbsences,
  insertWorkEntry,
} = require('../repositories/workEntryRepository')

const workEntriesRouter = require('./workEntries')

// App without auth — for GET tests (userId from query param)
const app = express()
app.use(express.json())
app.use('/api/work-entries', workEntriesRouter)

// App with stub auth — for POST tests (req.user.id = 42)
const authApp = express()
authApp.use(express.json())
authApp.use((req, _res, next) => { req.user = { id: 42, role: 'employee' }; next() })
authApp.use('/api/work-entries', workEntriesRouter)

describe('GET /api/work-entries', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns 400 when month param is missing', async () => {
    const res = await request(app).get('/api/work-entries')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'month query parameter is required' })
  })

  it('returns 400 when month is not in YYYY-MM format', async () => {
    const res = await request(app).get('/api/work-entries?month=05-2025')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'month must be in YYYY-MM format' })
  })

  it('returns 400 when month is a full date string', async () => {
    const res = await request(app).get('/api/work-entries?month=2025-05-01')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'month must be in YYYY-MM format' })
  })

  it('returns 200 with correct structure for a valid month (no data)', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('month', '2025-05')
    expect(res.body).toHaveProperty('userId', 1)
    expect(res.body).toHaveProperty('days')
    expect(Array.isArray(res.body.days)).toBe(true)
    expect(res.body.days).toHaveLength(31) // May has 31 days
  })

  it('returns correct day shape in days array', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05')

    const day = res.body.days[0]
    expect(day).toHaveProperty('date', '2025-05-01')
    expect(day).toHaveProperty('status')
    expect(day).toHaveProperty('totalHours')
    expect(day).toHaveProperty('entries')
    expect(day).toHaveProperty('absence')
    expect(Array.isArray(day.entries)).toBe(true)
    expect(day.absence).toBeNull()
  })

  it('uses stub userId=1 when userId param is omitted', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05')

    expect(getMonthlyEntries).toHaveBeenCalledWith(1, '2025-05')
    expect(getMonthlyAbsences).toHaveBeenCalledWith(1, '2025-05')
    expect(res.body.userId).toBe(1)
  })

  it('uses stub userId=1 when userId param is "me"', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05&userId=me')

    expect(getMonthlyEntries).toHaveBeenCalledWith(1, '2025-05')
    expect(res.body.userId).toBe(1)
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

    const res = await request(app).get('/api/work-entries?month=2025-05')

    const day5 = res.body.days.find(d => d.date === '2025-05-05')
    expect(day5.status).toBe('full')
    expect(day5.totalHours).toBe(9)
    expect(day5.entries).toHaveLength(1)
  })

  it('marks weekends correctly', async () => {
    getMonthlyEntries.mockResolvedValue([])
    getMonthlyAbsences.mockResolvedValue([])

    const res = await request(app).get('/api/work-entries?month=2025-05')

    // 2025-05-02 is Friday, 2025-05-03 is Saturday
    const friday = res.body.days.find(d => d.date === '2025-05-02')
    const saturday = res.body.days.find(d => d.date === '2025-05-03')
    expect(friday.status).toBe('weekend')
    expect(saturday.status).toBe('weekend')
  })

  it('returns 500 when repository throws', async () => {
    getMonthlyEntries.mockRejectedValue(new Error('DB exploded'))

    const res = await request(app).get('/api/work-entries?month=2025-05')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})

describe('POST /api/work-entries', () => {
  const validEntry = { start_time: '09:00', end_time: '18:00', task_id: 7, location: 'משרד' }
  const validBody = { date: '2025-05-13', entries: [validEntry] }

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns 201 with created entries on valid payload', async () => {
    const created = { id: 1, user_id: 42, task_id: 7, date: '2025-05-13', start_time: '09:00:00', end_time: '18:00:00', location: 'משרד' }
    insertWorkEntry.mockResolvedValue(created)

    const res = await request(authApp).post('/api/work-entries').send(validBody)

    expect(res.status).toBe(201)
    expect(res.body).toEqual([created])
    expect(insertWorkEntry).toHaveBeenCalledTimes(1)
    expect(insertWorkEntry).toHaveBeenCalledWith(42, { date: '2025-05-13', ...validEntry })
  })

  it('returns 201 and calls insertWorkEntry once per entry row when multiple rows are sent', async () => {
    insertWorkEntry.mockResolvedValue({})
    const body = {
      date: '2025-05-13',
      entries: [
        { start_time: '09:00', end_time: '13:00', task_id: 1, location: 'משרד' },
        { start_time: '14:00', end_time: '18:00', task_id: 2, location: 'בית' },
      ],
    }

    const res = await request(authApp).post('/api/work-entries').send(body)

    expect(res.status).toBe(201)
    expect(insertWorkEntry).toHaveBeenCalledTimes(2)
  })

  it('returns 400 when date is missing', async () => {
    const res = await request(authApp).post('/api/work-entries').send({ entries: [validEntry] })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/date/)
  })

  it('returns 400 when date is not in YYYY-MM-DD format', async () => {
    const res = await request(authApp).post('/api/work-entries').send({ date: '13-05-2025', entries: [validEntry] })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/date/)
  })

  it('returns 400 when entries is missing', async () => {
    const res = await request(authApp).post('/api/work-entries').send({ date: '2025-05-13' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/entries/)
  })

  it('returns 400 when entries is an empty array', async () => {
    const res = await request(authApp).post('/api/work-entries').send({ date: '2025-05-13', entries: [] })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/entries/)
  })

  it('returns 400 when start_time is missing from an entry', async () => {
    const res = await request(authApp).post('/api/work-entries').send({
      date: '2025-05-13',
      entries: [{ end_time: '18:00', task_id: 7, location: 'משרד' }],
    })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/start_time/)
  })

  it('returns 400 when end_time is missing from an entry', async () => {
    const res = await request(authApp).post('/api/work-entries').send({
      date: '2025-05-13',
      entries: [{ start_time: '09:00', task_id: 7, location: 'משרד' }],
    })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/end_time/)
  })

  it('returns 400 when end_time is not after start_time', async () => {
    const res = await request(authApp).post('/api/work-entries').send({
      date: '2025-05-13',
      entries: [{ start_time: '18:00', end_time: '09:00', task_id: 7, location: 'משרד' }],
    })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/end_time/)
  })

  it('returns 400 when start_time equals end_time', async () => {
    const res = await request(authApp).post('/api/work-entries').send({
      date: '2025-05-13',
      entries: [{ start_time: '09:00', end_time: '09:00', task_id: 7, location: 'משרד' }],
    })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/end_time/)
  })

  it('returns 500 when insertWorkEntry throws', async () => {
    insertWorkEntry.mockRejectedValue(new Error('DB exploded'))

    const res = await request(authApp).post('/api/work-entries').send(validBody)

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})
