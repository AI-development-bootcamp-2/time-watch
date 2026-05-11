import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AdminRoute from './AdminRoute'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../context/AuthContext'

function renderWithRouter(initialEntry = '/admin') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders spinner while isLoading is true', () => {
    useAuth.mockReturnValue({ isLoading: true, user: null })
    renderWithRouter()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('redirects to /login when user is null', () => {
    useAuth.mockReturnValue({ isLoading: false, user: null })
    renderWithRouter()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('redirects to / when user role is employee', () => {
    useAuth.mockReturnValue({ isLoading: false, user: { id: 1, role: 'employee' } })
    renderWithRouter()
    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('redirects to / when user role is undefined', () => {
    useAuth.mockReturnValue({ isLoading: false, user: { id: 1 } })
    renderWithRouter()
    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('renders outlet content when user role is admin', () => {
    useAuth.mockReturnValue({ isLoading: false, user: { id: 1, role: 'admin' } })
    renderWithRouter()
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument()
  })
})
