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

    const message = await res.text().catch(() => '') || `HTTP ${res.status}`
    throw { status: res.status, message }
  } catch (err) {
    if (typeof err.status === 'number') throw err
    throw { status: 0, message: 'Network error' }
  }
}
