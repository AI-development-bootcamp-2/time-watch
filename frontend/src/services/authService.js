async function request(method, path, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }
  const res = await fetch(path, options)
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export function login({ email, password }) {
  return request('POST', '/api/auth/login', { email, password })
}

export function getCurrentUser() {
  return request('GET', '/api/auth/me')
}

export async function logout() {
  try {
    await request('POST', '/api/auth/logout')
  } catch {
    // always resolves — AuthContext clears state regardless
  }
}
