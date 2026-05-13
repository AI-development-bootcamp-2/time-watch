// Auth state slice — lightweight token store with React subscription via
// useSyncExternalStore. Persists the JWT in localStorage so it survives
// reloads. Redux/Zustand can replace this later without changing callers.

import { useSyncExternalStore } from 'react'

const TOKEN_KEY = 'time_watch_token'
const listeners = new Set<() => void>()

// Notify every subscribed listener that the token changed
function emit() {
  listeners.forEach(l => l())
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
  emit()
}

export function clearToken() {
  setToken(null)
}

// Decode a JWT payload without verifying the signature (server is the source
// of truth — this is only used to short-circuit obviously-expired tokens on
// the client).
function decodeJwt(token: string | null | undefined) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    payload += '='.repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function isTokenValid(token = getToken()) {
  const payload = decodeJwt(token)
  if (!payload) return false
  if (typeof payload.exp === 'number') {
    return payload.exp * 1000 > Date.now()
  }
  // No exp claim — accept; server will reject on next request.
  return true
}

export function getCurrentUser() {
  return decodeJwt(getToken())
}

// Register a listener for token changes (in-tab via emit + cross-tab via storage event)
function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY) listener()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
  }
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage)
    }
  }
}

function getSnapshot() {
  return getToken()
}

function getServerSnapshot() {
  return null
}

export function useAuth() {
  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const user = decodeJwt(token)
  return {
    token,
    user,
    isAuthenticated: isTokenValid(token),
    setToken,
    clearToken,
  }
}
