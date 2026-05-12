'use strict'

const request = require('supertest')
const express = require('express')
const healthRouter = require('./health')

const app = express()
app.use('/api/health', healthRouter)

describe('GET /api/health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
