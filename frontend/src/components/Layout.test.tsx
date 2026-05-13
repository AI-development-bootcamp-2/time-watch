import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderWithAuth } from '../test-utils'
import type { AuthContextType } from '../context/AuthProvider'
import Layout from './Layout'

// Suppress Outlet warning — Layout renders an Outlet that has no matched child in tests
vi.mock('./LoadingSpinner', () => ({
  default: () => <div role="status">טוען...</div>,
}))

type TestUser = { id: string; role: string } | null

function renderLayout(user: TestUser) {
  return renderWithAuth(
    <MemoryRouter initialEntries={['/daily']}>
      <Layout />
    </MemoryRouter>,
    { user: user as AuthContextType['user'], isLoading: false }
  )
}

beforeEach(() => { vi.clearAllMocks() })

describe('Layout — admin nav visibility', () => {
  it('shows "ניהול" tab for admin users', () => {
    renderLayout({ id: '1', role: 'admin' })
    expect(screen.getByRole('link', { name: /ניהול/i })).toBeInTheDocument()
  })

  it('hides "ניהול" tab for employee users', () => {
    renderLayout({ id: '2', role: 'employee' })
    expect(screen.queryByRole('link', { name: /ניהול/i })).not.toBeInTheDocument()
  })

  it('hides "ניהול" tab when user is null (unauthenticated)', () => {
    renderLayout(null)
    expect(screen.queryByRole('link', { name: /ניהול/i })).not.toBeInTheDocument()
  })

  it('keeps the monthly nav link visible for non-admin users', () => {
    renderLayout({ id: '2', role: 'employee' })
    expect(screen.getByRole('link', { name: /לוח חודשי/i })).toBeInTheDocument()
  })

  it('shows both nav tabs for admin users', () => {
    renderLayout({ id: '1', role: 'admin' })
    expect(screen.getByRole('link', { name: /לוח חודשי/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ניהול/i })).toBeInTheDocument()
  })
})
