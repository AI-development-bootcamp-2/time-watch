import { screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
import { renderWithAuth } from '../test-utils'
import type { AuthContextType } from '../context/AuthProvider'

interface SetupOptions {
  isLoading?: boolean
  user?: { id: number; role?: string; must_change_password?: boolean } | null
  initialEntry?: string
}

function setup({ isLoading = false, user = null, initialEntry = '/' }: SetupOptions = {}) {
  renderWithAuth(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<div>Change Password Page</div>} />
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
    { isLoading, user: user as AuthContextType['user'] }
  )
}

describe('ProtectedRoute', () => {
  it('renders full-page spinner while isLoading is true', () => {
    setup({ isLoading: true })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('does not redirect to /login while isLoading is true', () => {
    setup({ isLoading: true })
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('redirects to /login when not loading and user is null', () => {
    setup({ isLoading: false, user: null })
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders outlet content when user is authenticated', () => {
    setup({ isLoading: false, user: { id: 1, role: 'employee' } })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('hard refresh: shows spinner and never flashes /login while auth is resolving', () => {
    setup({ isLoading: true })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to /change-password when must_change_password is true', () => {
    setup({ user: { id: 2, role: 'employee', must_change_password: true }, initialEntry: '/' })
    expect(screen.getByText('Change Password Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('does not redirect to /change-password when must_change_password is false', () => {
    setup({ user: { id: 2, role: 'employee', must_change_password: false }, initialEntry: '/' })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Change Password Page')).not.toBeInTheDocument()
  })

  it('allows access to /change-password even when must_change_password is true', () => {
    setup({ user: { id: 2, role: 'employee', must_change_password: true }, initialEntry: '/change-password' })
    expect(screen.getByText('Change Password Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
