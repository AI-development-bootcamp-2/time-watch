import { screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import AdminRoute from './AdminRoute'
import { renderWithAuth } from '../test-utils'

function setup({ isLoading = false, user = null, initialEntry = '/admin' } = {}) {
  renderWithAuth(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
    { isLoading, user }
  )
}

describe('AdminRoute', () => {
  it('renders spinner while isLoading is true', () => {
    setup({ isLoading: true })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('redirects to /login when user is null', () => {
    setup({ isLoading: false, user: null })
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('redirects to / when user role is employee', () => {
    setup({ isLoading: false, user: { id: 1, role: 'employee' } })
    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('redirects to / when user role is undefined', () => {
    setup({ isLoading: false, user: { id: 1 } })
    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('renders outlet content when user role is admin', () => {
    setup({ isLoading: false, user: { id: 1, role: 'admin' } })
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument()
  })
})
