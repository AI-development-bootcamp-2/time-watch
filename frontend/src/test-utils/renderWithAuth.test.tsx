import { screen } from '@testing-library/react'
import { useContext } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithAuth } from './renderWithAuth'
import { AuthContext } from '../context/AuthProvider'
import type { AuthContextType } from '../context/AuthProvider'

function AuthConsumer() {
  const { user, isLoading } = useContext(AuthContext)!
  return (
    <>
      <span data-testid="user">{user ? String(user.id) : 'null'}</span>
      <span data-testid="loading">{String(isLoading)}</span>
    </>
  )
}

describe('renderWithAuth', () => {
  it('provides null user and isLoading=false by default', () => {
    renderWithAuth(<AuthConsumer />)
    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
  })

  it('provides user when given', () => {
    renderWithAuth(<AuthConsumer />, { user: { id: 7 } as AuthContextType['user'] })
    expect(screen.getByTestId('user')).toHaveTextContent('7')
  })

  it('provides isLoading=true when given', () => {
    renderWithAuth(<AuthConsumer />, { isLoading: true })
    expect(screen.getByTestId('loading')).toHaveTextContent('true')
  })

  it('provides vi.fn() stubs for login and logout by default', () => {
    let capturedLogin: AuthContextType['login'] | undefined
    function LoginCapture() {
      const { login } = useContext(AuthContext)!
      capturedLogin = login
      return null
    }
    renderWithAuth(<LoginCapture />)
    expect(typeof capturedLogin).toBe('function')
  })

  it('uses provided login function', () => {
    const login = vi.fn() as unknown as AuthContextType['login']
    let capturedLogin: AuthContextType['login'] | undefined
    function LoginCapture() {
      const ctx = useContext(AuthContext)!
      capturedLogin = ctx.login
      return null
    }
    renderWithAuth(<LoginCapture />, { login })
    expect(capturedLogin).toBe(login)
  })
})
