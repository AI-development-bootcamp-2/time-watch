import { request } from './apiClient'

// Fetch all users (admin only)
export function getUsers() {
  return request('GET', '/api/users')
}

// Create a new user (admin only)
export function createUser(data) {
  return request('POST', '/api/users', data)
}

// Update an existing user by id (admin only)
export function updateUser(id, data) {
  return request('PUT', `/api/users/${id}`, data)
}

// Soft-deactivate a user by id; throws on last-admin guard (400)
export function deactivateUser(id) {
  return request('PATCH', `/api/users/${id}/deactivate`)
}
