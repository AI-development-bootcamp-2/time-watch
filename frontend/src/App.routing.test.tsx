/**
 * Integration tests for App routing guards.
 * Each test verifies that the correct guard (ProtectedRoute / AdminRoute)
 * redirects to the right destination for the given auth state and path.
 *
 * Strategy: render a lightweight AppShell with MemoryRouter + real AuthProvider
 * + mocked authApi, mirroring the route structure in App.tsx.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './features/auth/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

vi.mock('./services/authApi', () => ({
  login:  vi.fn(),
  getMe:  vi.fn(),
  logout: vi.fn(),
}))

import * as authApi from './services/authApi'

const mockedGetMe = vi.mocked(authApi.getMe)

// Lightweight stubs so tests don't load full page trees
const DailyStub  = () => <div>daily-page</div>
const UsersStub  = () => <div>users-page</div>
const AdminStub  = () => <div>admin-layout<Outlet /></div>

interface AppShellProps {
  initialEntries?: string[]
}

// Mirrors the real App.tsx route structure (without Layout chrome)
function AppShell({ initialEntries = ['/'] }: AppShellProps) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/"      element={<Navigate to="/daily" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/daily"    element={<DailyStub />} />
            <Route path="/monthly"  element={<div>monthly-page</div>} />
            <Route path="/absences" element={<div>absences-page</div>} />

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminStub />}>
                <Route index element={<Navigate to="users" replace />} />
                <Route path="users" element={<UsersStub />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => { vi.clearAllMocks() })

// ─── /login (public) ───────────────────────────────────────────────────────

describe('/login route', () => {
  it('renders the login form when the user is not authenticated', async () => {
    mockedGetMe.mockRejectedValue({ status: 401 })
    render(<AppShell initialEntries={['/login']} />)
    expect(await screen.findByRole('button', { name: /כניסה/i })).toBeInTheDocument()
  })

  it('redirects an already-authenticated user away from /login to /monthly', async () => {
    mockedGetMe.mockResolvedValue({ id: 1, role: 'employee' })
    render(<AppShell initialEntries={['/login']} />)
    await waitFor(() => expect(screen.getByText('monthly-page')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /כניסה/i })).not.toBeInTheDocument()
  })
})

// ─── ProtectedRoute (unauthenticated → /login) ────────────────────────────

describe('ProtectedRoute — unauthenticated users', () => {
  it('redirects to /login when visiting /daily without a session', async () => {
    mockedGetMe.mockRejectedValue({ status: 401 })
    render(<AppShell initialEntries={['/daily']} />)
    expect(await screen.findByRole('button', { name: /כניסה/i })).toBeInTheDocument()
    expect(screen.queryByText('daily-page')).not.toBeInTheDocument()
  })

  it('redirects to /login when visiting /monthly without a session', async () => {
    mockedGetMe.mockRejectedValue({ status: 401 })
    render(<AppShell initialEntries={['/monthly']} />)
    expect(await screen.findByRole('button', { name: /כניסה/i })).toBeInTheDocument()
  })

  it('redirects to /login when visiting /admin/users without a session', async () => {
    mockedGetMe.mockRejectedValue({ status: 401 })
    render(<AppShell initialEntries={['/admin/users']} />)
    expect(await screen.findByRole('button', { name: /כניסה/i })).toBeInTheDocument()
    expect(screen.queryByText('users-page')).not.toBeInTheDocument()
  })

  it('shows a loading spinner while the session check is in flight', () => {
    mockedGetMe.mockReturnValue(new Promise(() => {})) // never resolves
    render(<AppShell initialEntries={['/daily']} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('daily-page')).not.toBeInTheDocument()
  })
})

// ─── ProtectedRoute — authenticated employees ────────────────────────────

describe('ProtectedRoute — authenticated employees', () => {
  it('renders /daily for an authenticated employee', async () => {
    mockedGetMe.mockResolvedValue({ id: 1, role: 'employee' })
    render(<AppShell initialEntries={['/daily']} />)
    expect(await screen.findByText('daily-page')).toBeInTheDocument()
  })

  it('does not redirect an employee away from /daily to /login', async () => {
    mockedGetMe.mockResolvedValue({ id: 1, role: 'employee' })
    render(<AppShell initialEntries={['/daily']} />)
    await screen.findByText('daily-page')
    expect(screen.queryByRole('button', { name: /כניסה/i })).not.toBeInTheDocument()
  })
})

// ─── AdminRoute — role guard ──────────────────────────────────────────────

describe('AdminRoute — role guard', () => {
  it('renders /admin/users for an authenticated admin', async () => {
    mockedGetMe.mockResolvedValue({ id: 1, role: 'admin' })
    render(<AppShell initialEntries={['/admin/users']} />)
    expect(await screen.findByText('users-page')).toBeInTheDocument()
  })

  it('does NOT render /admin/users for an authenticated employee', async () => {
    mockedGetMe.mockResolvedValue({ id: 2, role: 'employee' })
    render(<AppShell initialEntries={['/admin/users']} />)
    // Employee is redirected away — should never see the admin page
    await waitFor(() =>
      expect(screen.queryByText('users-page')).not.toBeInTheDocument()
    )
  })

  it('sends an employee who visits /admin/users to the daily page', async () => {
    mockedGetMe.mockResolvedValue({ id: 2, role: 'employee' })
    render(<AppShell initialEntries={['/admin/users']} />)
    // AdminRoute → / → /daily (all within the protected zone)
    expect(await screen.findByText('daily-page')).toBeInTheDocument()
  })

  it('redirects an unauthenticated request for /admin/users to /login (not daily)', async () => {
    mockedGetMe.mockRejectedValue({ status: 401 })
    render(<AppShell initialEntries={['/admin/users']} />)
    // ProtectedRoute fires first, so the user sees /login, not the daily page
    expect(await screen.findByRole('button', { name: /כניסה/i })).toBeInTheDocument()
    expect(screen.queryByText('daily-page')).not.toBeInTheDocument()
    expect(screen.queryByText('users-page')).not.toBeInTheDocument()
  })
})

// ─── Catch-all ────────────────────────────────────────────────────────────

describe('catch-all route', () => {
  it('redirects unknown paths to /login when unauthenticated', async () => {
    mockedGetMe.mockRejectedValue({ status: 401 })
    render(<AppShell initialEntries={['/some/unknown/path']} />)
    expect(await screen.findByRole('button', { name: /כניסה/i })).toBeInTheDocument()
  })

  it('redirects unknown paths to /monthly when authenticated (via /login → /monthly)', async () => {
    mockedGetMe.mockResolvedValue({ id: 1, role: 'employee' })
    render(<AppShell initialEntries={['/some/unknown/path']} />)
    // * → /login → LoginPage sees authed user → Navigate to /monthly
    expect(await screen.findByText('monthly-page')).toBeInTheDocument()
  })
})
