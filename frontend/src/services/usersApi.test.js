import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getUsers, createUser, updateUser, deactivateUser } from './usersApi'

vi.mock('./apiClient', () => ({
  request: vi.fn(),
}))

import { request } from './apiClient'

beforeEach(() => vi.clearAllMocks())

describe('getUsers', () => {
  it('calls GET /api/users', async () => {
    request.mockResolvedValue([])
    await getUsers()
    expect(request).toHaveBeenCalledWith('GET', '/api/users')
  })

  it('returns the response from request', async () => {
    const users = [{ id: '1', full_name: 'ישראל ישראלי', email: 'a@b.com', role: 'employee', is_active: true }]
    request.mockResolvedValue(users)
    const result = await getUsers()
    expect(result).toEqual(users)
  })

  it('propagates errors from request', async () => {
    request.mockRejectedValue({ status: 403 })
    await expect(getUsers()).rejects.toEqual({ status: 403 })
  })
})

describe('createUser', () => {
  it('calls POST /api/users with the provided data', async () => {
    const data = { full_name: 'שרה לוי', email: 's@b.com', role: 'employee', password: 'Test1234!' }
    request.mockResolvedValue({ id: '2', ...data, is_active: true })
    await createUser(data)
    expect(request).toHaveBeenCalledWith('POST', '/api/users', data)
  })

  it('returns the created user', async () => {
    const created = { id: '2', full_name: 'שרה לוי', email: 's@b.com', role: 'employee', is_active: true }
    request.mockResolvedValue(created)
    const result = await createUser({ full_name: 'שרה לוי', email: 's@b.com', role: 'employee', password: 'Test1234!' })
    expect(result).toEqual(created)
  })

  it('propagates errors from request', async () => {
    request.mockRejectedValue({ status: 409 })
    await expect(createUser({})).rejects.toEqual({ status: 409 })
  })
})

describe('updateUser', () => {
  it('calls PUT /api/users/:id with the correct URL', async () => {
    const data = { full_name: 'דני כהן' }
    request.mockResolvedValue({ id: 'abc', ...data })
    await updateUser('abc', data)
    expect(request).toHaveBeenCalledWith('PUT', '/api/users/abc', data)
  })

  it('interpolates any id into the URL', async () => {
    request.mockResolvedValue({})
    await updateUser('xyz-123', {})
    expect(request).toHaveBeenCalledWith('PUT', '/api/users/xyz-123', {})
  })

  it('propagates errors from request', async () => {
    request.mockRejectedValue({ status: 400 })
    await expect(updateUser('1', {})).rejects.toEqual({ status: 400 })
  })
})

describe('deactivateUser', () => {
  it('calls PATCH /api/users/:id/deactivate', async () => {
    request.mockResolvedValue({ is_active: false })
    await deactivateUser('abc')
    expect(request).toHaveBeenCalledWith('PATCH', '/api/users/abc/deactivate')
  })

  it('interpolates any id into the URL', async () => {
    request.mockResolvedValue({})
    await deactivateUser('xyz-123')
    expect(request).toHaveBeenCalledWith('PATCH', '/api/users/xyz-123/deactivate')
  })

  it('propagates errors from request (last-admin guard)', async () => {
    request.mockRejectedValue({ status: 400 })
    await expect(deactivateUser('1')).rejects.toEqual({ status: 400 })
  })
})
