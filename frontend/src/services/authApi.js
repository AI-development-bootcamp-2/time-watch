import { request } from './apiClient'

export function login(email, password) {
  return request('POST', '/api/auth/login', { email, password })
}

export async function logout() {
  try {
    await request('POST', '/api/auth/logout')
  } catch {
    // always resolves — AuthContext clears user state regardless
  }
}

export function getMe() {
  return request('GET', '/api/auth/me')
}

// POST /api/auth/change-password — requires { current_password, new_password }
export function changePassword(current_password, new_password) {
  return request('POST', '/api/auth/change-password', { current_password, new_password })
}
