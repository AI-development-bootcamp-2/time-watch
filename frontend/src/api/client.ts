// Thin fetch wrapper that adds JWT auth headers, parses JSON, and surfaces
// errors as thrown exceptions so callers can just `try/catch`. Paths are
// relative (e.g. '/api/reports'); Vite's dev proxy forwards `/api` to the
// backend container.

import { getToken, clearToken } from '../features/auth/authSlice.ts'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type ApiOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }

export async function apiFetch(path: string, options: ApiOptions = {}): Promise<unknown> {
  const token = getToken()
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(path, { ...options, headers })
  } catch {
    throw new ApiError('שגיאת רשת — נסה שוב', 0, null)
  }

  const contentType = response.headers.get('content-type') || ''
  let body: unknown = null
  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => null)
  } else {
    body = await response.text().catch(() => null)
  }

  if (response.status === 401) {
    clearToken()
    throw new ApiError('פג תוקף החיבור — נא להתחבר מחדש', 401, body)
  }

  if (!response.ok) {
    const errObj = body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : null
    const msg: string =
      (errObj !== null && typeof errObj.message === 'string' && errObj.message) ||
      (errObj !== null && typeof errObj.error === 'string' && errObj.error) ||
      `שגיאה ${response.status}`
    throw new ApiError(msg, response.status, body)
  }

  return body
}
