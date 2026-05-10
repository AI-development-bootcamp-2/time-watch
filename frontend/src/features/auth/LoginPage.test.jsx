import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { vi, it, expect, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import LoginPage from './LoginPage'

vi.mock('../../services/authService', () => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}))

import * as authService from '../../services/authService'

function LogoutButtonTest() {
  const auth = useAuth()
  const navigate = useNavigate()
  return (
    <button onClick={async () => { await auth.logout(); navigate('/login', { replace: true }) }}>
      התנתק
    </button>
  )
}

function AppShell() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<div>Home <LogoutButtonTest /></div>} />
      </Route>
    </Routes>
  )
}

function renderApp(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// 15.1 valid session: spinner shows briefly then home renders — no redirect to /login
it('15.1 valid session on hard refresh: shows home without redirecting to login', async () => {
  authService.getCurrentUser.mockResolvedValue({ id: 1, role: 'employee' })

  renderApp(['/'])

  await waitFor(() => expect(screen.getByText(/Home/)).toBeInTheDocument())
  expect(screen.queryByRole('button', { name: /כניסה/i })).not.toBeInTheDocument()
})

// 15.2 expired session: getCurrentUser throws → redirects to /login
it('15.2 expired session on hard refresh: redirects to /login', async () => {
  const err = new Error('HTTP 401')
  err.status = 401
  authService.getCurrentUser.mockRejectedValue(err)

  renderApp(['/'])

  await waitFor(() =>
    expect(screen.getByRole('button', { name: /כניסה/i })).toBeInTheDocument()
  )
  expect(screen.queryByText(/Home/)).not.toBeInTheDocument()
})

// 15.3 successful login: redirects to home
it('15.3 successful login redirects to home', async () => {
  authService.getCurrentUser.mockRejectedValue(new Error('401'))
  authService.login.mockResolvedValue({ id: 1, email: 'admin@test.com', role: 'admin' })

  renderApp(['/login'])

  await userEvent.type(await screen.findByLabelText(/אימייל/i), 'admin@test.com')
  await userEvent.type(screen.getByLabelText('סיסמה'), '1234')
  await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))

  await waitFor(() => expect(screen.getByText(/Home/)).toBeInTheDocument())
})

// 15.4 wrong credentials (401): Hebrew error shown, stays on /login
it('15.4 wrong credentials shows Hebrew 401 error', async () => {
  authService.getCurrentUser.mockRejectedValue(new Error('401'))
  const err = new Error('HTTP 401')
  err.status = 401
  authService.login.mockRejectedValue(err)

  renderApp(['/login'])

  await userEvent.type(await screen.findByLabelText(/אימייל/i), 'wrong@test.com')
  await userEvent.type(screen.getByLabelText('סיסמה'), 'bad')
  await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))

  await waitFor(() =>
    expect(screen.getByText('האימייל או הסיסמה שגויים')).toBeInTheDocument()
  )
  expect(screen.queryByText(/Home/)).not.toBeInTheDocument()
})

// 15.5 locked account (423): distinct Hebrew error shown, stays on /login
it('15.5 locked account shows Hebrew 423 error', async () => {
  authService.getCurrentUser.mockRejectedValue(new Error('401'))
  const err = new Error('HTTP 423')
  err.status = 423
  authService.login.mockRejectedValue(err)

  renderApp(['/login'])

  await userEvent.type(await screen.findByLabelText(/אימייל/i), 'locked@test.com')
  await userEvent.type(screen.getByLabelText('סיסמה'), '1234')
  await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))

  await waitFor(() =>
    expect(screen.getByText('החשבון ננעל עקב ניסיונות התחברות מרובים')).toBeInTheDocument()
  )
  expect(screen.queryByText(/Home/)).not.toBeInTheDocument()
})

// 15.6 network error (no response): generic Hebrew error shown, stays on /login
it('15.6 network error shows generic Hebrew error', async () => {
  authService.getCurrentUser.mockRejectedValue(new Error('401'))
  authService.login.mockRejectedValue(new Error('Network Error'))

  renderApp(['/login'])

  await userEvent.type(await screen.findByLabelText(/אימייל/i), 'network@test.com')
  await userEvent.type(screen.getByLabelText('סיסמה'), '1234')
  await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))

  await waitFor(() =>
    expect(screen.getByText('אירעה שגיאה. נסי שוב מאוחר יותר')).toBeInTheDocument()
  )
  expect(screen.queryByText(/Home/)).not.toBeInTheDocument()
})

// 15.7 logout: user is cleared, browser lands on /login
it('15.7 logout clears user and redirects to /login', async () => {
  authService.getCurrentUser.mockResolvedValue({ id: 1, role: 'employee' })
  authService.logout.mockResolvedValue(undefined)

  renderApp(['/'])

  await waitFor(() => expect(screen.getByText(/Home/)).toBeInTheDocument())

  await userEvent.click(screen.getByRole('button', { name: /התנתק/i }))

  await waitFor(() =>
    expect(screen.getByRole('button', { name: /כניסה/i })).toBeInTheDocument()
  )
  expect(screen.queryByText(/Home/)).not.toBeInTheDocument()
})
