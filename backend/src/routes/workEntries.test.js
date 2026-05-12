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

const app = express()
app.use(express.json())
app.use('/api/work-entries', workEntriesRouter)

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
