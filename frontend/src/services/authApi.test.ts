import { vi, describe, it, expect, beforeEach } from 'vitest'
import { login, logout, getMe } from './authApi'

vi.mock('./apiClient', () => ({
  request: vi.fn(),
}))

import { request } from './apiClient'

const mockRequest = vi.mocked(request)

beforeEach(() => { vi.clearAllMocks() })

describe('login', () => {
  it('calls POST /api/auth/login with email and password', async () => {
    mockRequest.mockResolvedValue({ id: 1 })
    await login('a@b.com', 'secret')
    expect(request).toHaveBeenCalledWith('POST', '/api/auth/login', { email: 'a@b.com', password: 'secret' })
  })

  it('returns the response from request', async () => {
    const user = { id: 1, role: 'admin' }
    mockRequest.mockResolvedValue(user)
    const result = await login('a@b.com', 'secret')
    expect(result).toEqual(user)
  })

  it('propagates errors from request', async () => {
    mockRequest.mockRejectedValue({ status: 401 })
    await expect(login('a@b.com', 'bad')).rejects.toEqual({ status: 401 })
  })
})

describe('logout', () => {
  it('calls POST /api/auth/logout', async () => {
    mockRequest.mockResolvedValue(null)
    await logout()
    expect(request).toHaveBeenCalledWith('POST', '/api/auth/logout')
  })

  it('resolves even when request rejects', async () => {
    mockRequest.mockRejectedValue(new Error('network'))
    await expect(logout()).resolves.toBeUndefined()
  })
})

describe('getMe', () => {
  it('calls GET /api/auth/me', async () => {
    mockRequest.mockResolvedValue({ id: 1 })
    await getMe()
    expect(request).toHaveBeenCalledWith('GET', '/api/auth/me')
  })

  it('returns the response from request', async () => {
    const user = { id: 5, role: 'employee' }
    mockRequest.mockResolvedValue(user)
    const result = await getMe()
    expect(result).toEqual(user)
  })

  it('propagates errors from request', async () => {
    mockRequest.mockRejectedValue({ status: 401 })
    await expect(getMe()).rejects.toEqual({ status: 401 })
  })
})
