import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderWithAuth } from '../test-utils'
import Layout from './Layout'

const mockAuth = vi.hoisted(() => ({
  value: { user: null, logout: vi.fn() },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth.value,
}))

// Suppress Outlet warning — Layout renders an Outlet that has no matched child in tests
vi.mock('./LoadingSpinner', () => ({
  default: () => <div role="status">טוען...</div>,
}))

function renderLayout(user) {
  mockAuth.value = { user, logout: vi.fn() }
  return renderWithAuth(
    <MemoryRouter initialEntries={['/daily']}>
      <Layout />
    </MemoryRouter>,
    { user, isLoading: false }
  )
}

beforeEach(() => vi.clearAllMocks())

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

  it('keeps all other nav tabs visible for non-admin users', () => {
    renderLayout({ id: '2', role: 'employee' })
    expect(screen.getByRole('link', { name: /דיווח יומי/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /לוח חודשי/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /היעדרויות/i })).toBeInTheDocument()
  })

  it('shows all four nav tabs for admin users', () => {
    renderLayout({ id: '1', role: 'admin' })
    expect(screen.getByRole('link', { name: /דיווח יומי/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /לוח חודשי/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /היעדרויות/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ניהול/i })).toBeInTheDocument()
  })

  it('opens the work report form from the daily route query string', () => {
    mockAuth.value = { user: { id: '2', role: 'employee' }, logout: vi.fn() }
    renderWithAuth(
      <MemoryRouter initialEntries={['/daily?report=work&date=2026-05-10']}>
        <Layout />
      </MemoryRouter>,
      { user: { id: '2', role: 'employee' }, isLoading: false }
    )

    expect(screen.getByRole('dialog', { name: /דיווח עבודה/i })).toBeInTheDocument()
    expect(screen.getByText('יום א׳ 10/05/26')).toBeInTheDocument()
  })
})
