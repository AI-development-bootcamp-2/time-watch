'use strict'

const request = require('supertest')
const express = require('express')
const tasksRouter = require('./tasks')

const app = express()
app.use(express.json())
app.use('/api/tasks', tasksRouter)

describe('GET /api/tasks', () => {
  it.todo('returns 200 with tasks assigned to the authenticated user')
  it.todo('admin receives all tasks when no userId filter is applied')
  it.todo('returns 401 when not authenticated')
})

describe('POST /api/tasks', () => {
  it.todo('returns 201 with new task when name and project_id are provided')
  it.todo('returns 400 when required fields are missing')
  it.todo('returns 403 when authenticated as non-admin')
})

describe('PUT /api/tasks/:id', () => {
  it.todo('returns 200 with updated task on valid payload')
  it.todo('returns 404 when task does not exist')
  it.todo('returns 403 when authenticated as non-admin')
})
