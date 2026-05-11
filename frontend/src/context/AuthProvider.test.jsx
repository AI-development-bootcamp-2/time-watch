import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useContext } from 'react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider, AuthContext } from './AuthProvider'

vi.mock('../services/authApi', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
}))

import * as authApi from '../services/authApi'

function TestConsumer() {
  const { user, isLoading, login, logout } = useContext(AuthContext)
  return (
    <>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user ? String(user.id) : 'null'}</span>
      <span data-testid="user-name">{user?.name ?? 'none'}</span>
      <span data-testid="user-full_name">{user?.full_name ?? 'none'}</span>
      <button onClick={async () => { try { await logout() } catch {} }}>Logout</button>
      <button onClick={async () => { try { await login('a@b.com', 'pw') } catch {} }}>Login</button>
    </>
  )
}

function renderProvider() {
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  )
}

beforeEach(() => vi.clearAllMocks())

describe('AuthProvider — session restore on mount', () => {
  it('calls getMe exactly once on mount', async () => {
    authApi.getMe.mockResolvedValue({ id: 1 })
    renderProvider()
    await waitFor(() => expect(authApi.getMe).toHaveBeenCalledTimes(1))
  })

  it('isLoading is true before getMe settles', () => {
    authApi.getMe.mockReturnValue(new Promise(() => {}))
    renderProvider()
    expect(screen.getByTestId('loading')).toHaveTextContent('true')
  })

  it('isLoading becomes false after getMe resolves', async () => {
    authApi.getMe.mockResolvedValue({ id: 1 })
    renderProvider()
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    )
  })

  it('populates user on successful getMe', async () => {
    authApi.getMe.mockResolvedValue({ id: 42, role: 'employee' })
    renderProvider()
    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent('42')
    )
  })

  it('sets user to null on getMe failure', async () => {
    authApi.getMe.mockRejectedValue({ status: 401, message: 'Unauthorized' })
    renderProvider()
    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    )
  })

  it('sets isLoading to false even when getMe fails', async () => {
    authApi.getMe.mockRejectedValue({ status: 401 })
    renderProvider()
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    )
  })
})

describe('AuthProvider — logout', () => {
  it('clears user after successful logout', async () => {
    authApi.getMe.mockResolvedValue({ id: 1 })
    authApi.logout.mockResolvedValue(undefined)
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('1'))

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }))

    expect(screen.getByTestId('user')).toHaveTextContent('null')
  })

  it('clears user even when apiLogout rejects', async () => {
    authApi.getMe.mockResolvedValue({ id: 1 })
    authApi.logout.mockRejectedValue(new Error('network failure'))
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('1'))

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }))

    expect(screen.getByTestId('user')).toHaveTextContent('null')
  })
})

describe('AuthProvider — login', () => {
  it('sets user from API response on successful login', async () => {
    authApi.getMe.mockRejectedValue({ status: 401 })
    authApi.login.mockResolvedValue({ id: 5, role: 'admin' })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await userEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent('5')
    )
  })

  it('maps full_name from login response to name on the user object', async () => {
    authApi.getMe.mockRejectedValue({ status: 401 })
    authApi.login.mockResolvedValue({ id: 5, full_name: 'ישראל ישראלי', email: 'israel@example.com', role: 'employee' })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await userEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('5'))
    expect(screen.getByTestId('user-name')).toHaveTextContent('ישראל ישראלי')
    expect(screen.getByTestId('user-full_name')).toHaveTextContent('none')
  })
})
