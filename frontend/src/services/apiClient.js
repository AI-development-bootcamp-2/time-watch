const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function request(method, path, body) {
  try {
    const url = `${BASE_URL}${path}`
    const options = { method, credentials: 'include' }

    if (body !== undefined) {
      options.headers = { 'Content-Type': 'application/json' }
      options.body = JSON.stringify(body)
    }

    const res = await fetch(url, options)

    if (res.ok) {
      if (res.status === 204) return null
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) return res.json()
      return null
    }

    const errorBody = await res.json().catch(() => null)
    const err = new Error(errorBody?.message || `HTTP ${res.status}`)
    err.status = res.status
    err.code = errorBody?.code ?? null
    throw err
  } catch (err) {
    if (typeof err.status === 'number') throw err
    const netErr = new Error('Network error')
    netErr.status = 0
    throw netErr
  }
}
