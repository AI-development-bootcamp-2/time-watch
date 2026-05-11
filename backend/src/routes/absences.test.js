'use strict'

const request = require('supertest')
const express = require('express')
const absencesRouter = require('./absences')

const app = express()
app.use(express.json())
app.use('/api/absences', absencesRouter)

describe('GET /api/absences', () => {
  it.todo('returns 200 with absences for the authenticated user')
  it.todo('admin can pass userId param to fetch another user\'s absences')
  it.todo('returns 401 when not authenticated')
})

describe('POST /api/absences', () => {
  it.todo('returns 201 with new absence on valid payload')
  it.todo('returns 400 when required fields are missing')
  it.todo('returns 400 when end_date is before start_date')
  it.todo('excludes Fridays and Saturdays from date range count')
  it.todo('returns 400 when a partial-day absence has no complementary hours report')
})

describe('PUT /api/absences/:id', () => {
  it.todo('returns 200 with updated absence on valid payload')
  it.todo('returns 404 when absence does not exist')
  it.todo('returns 403 when editing another user\'s absence without admin role')
})

describe('POST /api/absences/:id/document', () => {
  it.todo('returns 200 after uploading a document for sick/military absence')
  it.todo('returns 400 when no file is attached')
  it.todo('returns 404 when absence does not exist')
})
