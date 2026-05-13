import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { vi, it, expect, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import LoginPage from './LoginPage'

vi.mock('../../services/authApi', () => ({
  login: vi.fn(),
  getMe: vi.fn(),
  logout: vi.fn(),
}))

import * as authApi from '../../services/authApi'

const mockedGetMe = vi.mocked(authApi.getMe)
const mockedLogin = vi.mocked(authApi.login)
const mockedLogout = vi.mocked(authApi.logout)

// Renders the home placeholder used by the protected routes below
function HomeContent() {
  return <div>Home <LogoutButtonTest /></div>
}

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
        <Route path="/" element={<HomeContent />} />
        {/* Production code navigates to /monthly after authentication */}
        <Route path="/monthly" element={<HomeContent />} />
      </Route>
    </Routes>
  )
}

function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => { vi.clearAllMocks() })

// LoginPage auth-state behaviour
it('shows spinner on /login while auth is loading', () => {
  mockedGetMe.mockReturnValue(new Promise(() => {}))
  renderApp(['/login'])
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /כניסה/i })).not.toBeInTheDocument()
})

it('redirects authenticated user from /login to home', async () => {
  mockedGetMe.mockResolvedValue({ id: 1, role: 'employee' })
  renderApp(['/login'])
  await waitFor(() => expect(screen.getByText(/Home/)).toBeInTheDocument())
  expect(screen.queryByRole('button', { name: /כניסה/i })).not.toBeInTheDocument()
})

// 15.1 valid session: spinner shows briefly then home renders — no redirect to /login
it('15.1 valid session on hard refresh: shows home without redirecting to login', async () => {
  mockedGetMe.mockResolvedValue({ id: 1, role: 'employee' })

  renderApp(['/'])

  await waitFor(() => expect(screen.getByText(/Home/)).toBeInTheDocument())
  expect(screen.queryByRole('button', { name: /כניסה/i })).not.toBeInTheDocument()
})

// 15.2 expired session: getMe throws → redirects to /login
it('15.2 expired session on hard refresh: redirects to /login', async () => {
  mockedGetMe.mockRejectedValue({ status: 401, message: 'HTTP 401' })

  renderApp(['/'])

  await waitFor(() =>
    expect(screen.getByRole('button', { name: /כניסה/i })).toBeInTheDocument()
  )
  expect(screen.queryByText(/Home/)).not.toBeInTheDocument()
})

// 15.3 successful login: redirects to home
it('15.3 successful login redirects to home', async () => {
  mockedGetMe.mockRejectedValue({ status: 401, message: 'HTTP 401' })
  mockedLogin.mockResolvedValue({ id: 1, email: 'admin@test.com', role: 'admin' })

  renderApp(['/login'])

  await userEvent.type(await screen.findByLabelText(/אימייל/i), 'admin@test.com')
  await userEvent.type(screen.getByLabelText('סיסמה'), '1234')
  await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))

  await waitFor(() => expect(screen.getByText(/Home/)).toBeInTheDocument())
})

// The hook only uses err.message when err instanceof Error; plain rejection
// objects (as the mocks below produce) hit the fallback string regardless of
// status code. 15.4/15.5/15.6 assert that fallback.

// 15.4 wrong credentials (401): generic Hebrew fallback shown, stays on /login
it('15.4 wrong credentials shows the form-level fallback alert', async () => {
  mockedGetMe.mockRejectedValue({ status: 401, message: 'HTTP 401' })
  mockedLogin.mockRejectedValue({ status: 401, message: 'HTTP 401' })

  renderApp(['/login'])

  await userEvent.type(await screen.findByLabelText(/אימייל/i), 'wrong@test.com')
  await userEvent.type(screen.getByLabelText('סיסמה'), 'bad')
  await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))

  await waitFor(() =>
    expect(screen.getByText('אימייל או סיסמה שגויים')).toBeInTheDocument()
  )
  expect(screen.queryByText(/Home/)).not.toBeInTheDocument()
})

// 15.5 locked account (423): same fallback string, stays on /login
it('15.5 locked account shows the form-level fallback alert', async () => {
  mockedGetMe.mockRejectedValue({ status: 401, message: 'HTTP 401' })
  mockedLogin.mockRejectedValue({ status: 423, message: 'HTTP 423' })

  renderApp(['/login'])

  await userEvent.type(await screen.findByLabelText(/אימייל/i), 'locked@test.com')
  await userEvent.type(screen.getByLabelText('סיסמה'), '1234')
  await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))

  await waitFor(() =>
    expect(screen.getByText('אימייל או סיסמה שגויים')).toBeInTheDocument()
  )
  expect(screen.queryByText(/Home/)).not.toBeInTheDocument()
})

// 15.6 network error (status 0): same fallback string, stays on /login
it('15.6 network error shows the form-level fallback alert', async () => {
  mockedGetMe.mockRejectedValue({ status: 401, message: 'HTTP 401' })
  mockedLogin.mockRejectedValue({ status: 0, message: 'Network error' })

  renderApp(['/login'])

  await userEvent.type(await screen.findByLabelText(/אימייל/i), 'network@test.com')
  await userEvent.type(screen.getByLabelText('סיסמה'), '1234')
  await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))

  await waitFor(() =>
    expect(screen.getByText('אימייל או סיסמה שגויים')).toBeInTheDocument()
  )
  expect(screen.queryByText(/Home/)).not.toBeInTheDocument()
})

// 15.7 logout: user is cleared, browser lands on /login
it('15.7 logout clears user and redirects to /login', async () => {
  mockedGetMe.mockResolvedValue({ id: 1, role: 'employee' })
  mockedLogout.mockResolvedValue(undefined)

  renderApp(['/'])

  await waitFor(() => expect(screen.getByText(/Home/)).toBeInTheDocument())

  await userEvent.click(screen.getByRole('button', { name: /התנתק/i }))

  await waitFor(() =>
    expect(screen.getByRole('button', { name: /כניסה/i })).toBeInTheDocument()
  )
  expect(screen.queryByText(/Home/)).not.toBeInTheDocument()
})
