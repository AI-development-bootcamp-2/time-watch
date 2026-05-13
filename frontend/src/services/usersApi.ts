import { request } from './apiClient'

// Fetch all users (admin only)
export function getUsers(): Promise<unknown> {
  return request('GET', '/api/users')
}

// Create a new user (admin only)
export function createUser(data: unknown): Promise<unknown> {
  return request('POST', '/api/users', data)
}

// Update an existing user by id (admin only)
export function updateUser(id: string | number, data: unknown): Promise<unknown> {
  return request('PUT', `/api/users/${id}`, data)
}

// Soft-deactivate a user by id; throws on last-admin guard (400)
export function deactivateUser(id: string | number): Promise<unknown> {
  return request('PATCH', `/api/users/${id}/deactivate`)
}

// Reactivate a previously deactivated user
export function activateUser(id: string | number): Promise<unknown> {
  return request('PATCH', `/api/users/${id}/activate`)
}
