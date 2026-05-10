// ─── Auth service ────────────────────────────────────────────────────────────
// To replace the mock with the real backend, swap the implementation of
// `_request` below and delete the mock block. The login() signature stays
// the same so LoginPage.jsx needs no changes.
// ─────────────────────────────────────────────────────────────────────────────

// Real implementation (uncomment when backend is ready):
// async function _request(email, password) {
//   const res = await fetch('/api/auth/login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email, password }),
//   })
//   if (!res.ok) {
//     const err = new Error('Login failed')
//     err.status = res.status
//     throw err
//   }
//   return res.json()          // { token }
// }

// ── Mock implementation ───────────────────────────────────────────────────────
async function _request(email, password) {
  await new Promise(resolve => setTimeout(resolve, 800))

  if (email === 'network@test.com') {
    throw new Error('Network error')     // no .status → treated as network failure
  }

  if (email === 'locked@test.com') {
    const err = new Error('Account locked')
    err.status = 423
    throw err
  }

  if (email === 'admin@test.com' && password === '1234') {
    return { token: 'mock-jwt-token' }
  }

  const err = new Error('Invalid credentials')
  err.status = 401
  throw err
}
// ─────────────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  return _request(email, password)
}
