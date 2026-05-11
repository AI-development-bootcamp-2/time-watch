import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ProtectedRoute from './ProtectedRoute'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../context/AuthContext'

function renderWithRouter(initialEntry = '/') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders full-page spinner while isLoading is true', () => {
    useAuth.mockReturnValue({ isLoading: true, user: null })
    renderWithRouter('/')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('does not redirect to /login while isLoading is true', () => {
    useAuth.mockReturnValue({ isLoading: true, user: null })
    renderWithRouter('/')
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('redirects to /login when not loading and user is null', () => {
    useAuth.mockReturnValue({ isLoading: false, user: null })
    renderWithRouter('/')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders outlet content when user is authenticated', () => {
    useAuth.mockReturnValue({ isLoading: false, user: { id: 1, role: 'employee' } })
    renderWithRouter('/')
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('hard refresh: shows spinner and never flashes /login while auth is resolving', () => {
    useAuth.mockReturnValue({ isLoading: true, user: null })
    renderWithRouter('/')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
