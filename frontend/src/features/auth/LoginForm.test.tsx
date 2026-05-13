import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import type { Mock } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LoginForm from './LoginForm'
import { renderWithAuth } from '../../test-utils'
import type { AuthContextType } from '../../context/AuthProvider'

function renderForm(loginFn: Mock = vi.fn()) {
  const { container } = renderWithAuth(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
    { login: loginFn as unknown as AuthContextType['login'] }
  )
  return { container }
}

describe('RTL rendering', () => {
  it('form element has dir="rtl"', () => {
    const { container } = renderForm()
    expect(container.querySelector('form')).toHaveAttribute('dir', 'rtl')
  })

  it('email input has dir="rtl"', () => {
    renderForm()
    expect(screen.getByLabelText('אימייל')).toHaveAttribute('dir', 'rtl')
  })

  it('password input has dir="rtl"', () => {
    renderForm()
    expect(screen.getByLabelText('סיסמה')).toHaveAttribute('dir', 'rtl')
  })
})

describe('Accessibility labels', () => {
  it('email input has an associated label', () => {
    renderForm()
    expect(screen.getByLabelText('אימייל')).toHaveAttribute('type', 'email')
  })

  it('password input has an associated label', () => {
    renderForm()
    expect(screen.getByLabelText('סיסמה')).toHaveAttribute('type', 'password')
  })

  it('email input has aria-invalid=false when no error', () => {
    renderForm()
    expect(screen.getByLabelText('אימייל')).toHaveAttribute('aria-invalid', 'false')
  })

  it('email input has aria-invalid=true after failed validation', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))
    expect(screen.getByLabelText('אימייל')).toHaveAttribute('aria-invalid', 'true')
  })

  it('email input has aria-describedby pointing to error element', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))
    expect(screen.getByLabelText('אימייל')).toHaveAttribute('aria-describedby', 'email-error')
  })

  it('email input has no aria-describedby when there is no error', () => {
    renderForm()
    expect(screen.getByLabelText('אימייל')).not.toHaveAttribute('aria-describedby')
  })
})

describe('Submit button', () => {
  it('is enabled by default', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /כניסה/i })).not.toBeDisabled()
  })

  it('is disabled while isSubmitting', async () => {
    let resolve: (() => void) | undefined
    const login = vi.fn(() => new Promise<void>(r => { resolve = r }))
    renderForm(login)
    await userEvent.type(screen.getByLabelText('אימייל'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('סיסמה'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))
    expect(screen.getByRole('button', { name: 'מתחבר...' })).toBeDisabled()
    await act(async () => { resolve?.() })
  })

  it('shows Hebrew loading text while submitting', async () => {
    let resolve: (() => void) | undefined
    const login = vi.fn(() => new Promise<void>(r => { resolve = r }))
    renderForm(login)
    await userEvent.type(screen.getByLabelText('אימייל'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('סיסמה'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))
    expect(screen.getByRole('button', { name: 'מתחבר...' })).toHaveTextContent('מתחבר...')
    await act(async () => { resolve?.() })
  })
})

describe('Inline error rendering', () => {
  it('shows the required-email message with role="alert" for empty email', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))
    const alerts = screen.getAllByRole('alert')
    expect(alerts.some(a => a.textContent === 'נא להזין אימייל')).toBe(true)
  })

  // The hook only uses err.message when err instanceof Error; plain rejection
  // objects (as the mocks below produce) hit the fallback string regardless of
  // status code. All three tests assert that fallback.
  it('shows the form-level fallback alert when 401 is rejected as a plain object', async () => {
    const login = vi.fn().mockRejectedValue({ status: 401 })
    renderForm(login)
    await userEvent.type(screen.getByLabelText('אימייל'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('סיסמה'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('אימייל או סיסמה שגויים')
    )
  })

  it('shows the form-level fallback alert when 423 is rejected as a plain object', async () => {
    const login = vi.fn().mockRejectedValue({ status: 423 })
    renderForm(login)
    await userEvent.type(screen.getByLabelText('אימייל'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('סיסמה'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('אימייל או סיסמה שגויים')
    )
  })

  it('shows the form-level fallback alert when 5xx is rejected as a plain object', async () => {
    const login = vi.fn().mockRejectedValue({ status: 500 })
    renderForm(login)
    await userEvent.type(screen.getByLabelText('אימייל'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('סיסמה'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /כניסה/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('אימייל או סיסמה שגויים')
    )
  })
})

describe('Password show/hide toggle', () => {
  it('password input type is "password" by default', () => {
    renderForm()
    expect(screen.getByLabelText('סיסמה')).toHaveAttribute('type', 'password')
  })

  it('toggle button has aria-label', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'הצג סיסמה' })).toBeInTheDocument()
  })

  it('clicking toggle reveals password (type becomes text)', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'הצג סיסמה' }))
    expect(screen.getByLabelText('סיסמה')).toHaveAttribute('type', 'text')
  })

  it('clicking toggle again hides password (type reverts to password)', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'הצג סיסמה' }))
    await userEvent.click(screen.getByRole('button', { name: 'הסתר סיסמה' }))
    expect(screen.getByLabelText('סיסמה')).toHaveAttribute('type', 'password')
  })

  it('aria-label updates to "הסתר סיסמה" when password is visible', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'הצג סיסמה' }))
    expect(screen.getByRole('button', { name: 'הסתר סיסמה' })).toBeInTheDocument()
  })
})


describe('Enter key form submission', () => {
  it('submits form when Enter is pressed inside email field', async () => {
    const login = vi.fn().mockResolvedValue({ id: 1 })
    renderForm(login)
    await userEvent.type(screen.getByLabelText('אימייל'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('סיסמה'), 'secret')
    await userEvent.type(screen.getByLabelText('אימייל'), '{Enter}')
    await waitFor(() => expect(login).toHaveBeenCalledWith('user@example.com', 'secret'))
  })

  it('submits form when Enter is pressed inside password field', async () => {
    const login = vi.fn().mockResolvedValue({ id: 1 })
    renderForm(login)
    await userEvent.type(screen.getByLabelText('אימייל'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('סיסמה'), 'secret{Enter}')
    await waitFor(() => expect(login).toHaveBeenCalledWith('user@example.com', 'secret'))
  })
})
