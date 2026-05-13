import { request } from './apiClient'

// Fetch user-task assignments filtered by userId or taskId
export function getUserTasks({ userId, taskId }) {
  const param = userId ? `user_id=${userId}` : `task_id=${taskId}`
  return request('GET', `/api/user-tasks?${param}`)
}

// Assign a task to a user
export function assignTask({ userId, taskId }) {
  return request('POST', '/api/user-tasks', { user_id: userId, task_id: taskId })
}

// Remove a task assignment from a user
export function removeAssignment({ userId, taskId }) {
  return request('DELETE', '/api/user-tasks', { user_id: userId, task_id: taskId })
}
