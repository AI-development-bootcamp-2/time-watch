import { screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
import { renderWithAuth } from '../test-utils'

function setup({ isLoading = false, user = null, initialEntry = '/' } = {}) {
  renderWithAuth(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
    { isLoading, user }
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
})
