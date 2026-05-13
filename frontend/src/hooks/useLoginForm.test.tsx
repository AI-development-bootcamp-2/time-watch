import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useLoginForm } from './useLoginForm'
import { renderWithRouter } from '../test-utils'

interface TestFormProps {
  onSubmit?: (email: string, password: string) => Promise<unknown>
}

function TestForm({ onSubmit = vi.fn() }: TestFormProps = {}) {
  const form = useLoginForm({ onSubmit })
  return (
    <form onSubmit={form.handleSubmit}>
      <label htmlFor="email">email</label>
      <input
        id="email"
        name="email"
        value={form.email}
        onChange={form.handleChange}
        ref={form.emailRef}
      />
      {form.errors.email && <p data-testid="email-error">{form.errors.email}</p>}

      <label htmlFor="password">password</label>
      <input
        id="password"
        name="password"
        type="password"
        value={form.password}
        onChange={form.handleChange}
        ref={form.passwordRef}
      />
      {form.errors.password && <p data-testid="password-error">{form.errors.password}</p>}

      {form.errors.form && <p data-testid="form-error">{form.errors.form}</p>}

      <button type="submit" disabled={form.isSubmitting}>submit</button>
    </form>
  )
}

function renderForm(props: TestFormProps = {}) {
  const onSubmit = props.onSubmit ?? vi.fn()
  renderWithRouter(<TestForm {...props} onSubmit={onSubmit} />)
  return { onSubmit }
}

beforeEach(() => { vi.clearAllMocks() })

describe('validate()', () => {
  it('shows the required-email message for empty email on submit', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByTestId('email-error')).toHaveTextContent('נא להזין אימייל')
  })

  it('shows the required-password message when email is valid but password is empty', async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByTestId('password-error')).toHaveTextContent('נא להזין סיסמה')
  })

  it('does not call onSubmit when validation fails', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('clearing errors on typing', () => {
  it('clears email error when user types in the email field', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByTestId('email-error')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('email'), 'a')
    expect(screen.queryByTestId('email-error')).not.toBeInTheDocument()
  })

  it('clears password error when user types in the password field', async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByTestId('password-error')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('password'), 'a')
    expect(screen.queryByTestId('password-error')).not.toBeInTheDocument()
  })

  it('clears form-level error when user types', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 401 })
    renderWithRouter(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(screen.getByTestId('form-error')).toBeInTheDocument())

    await userEvent.type(screen.getByLabelText('email'), 'x')
    expect(screen.queryByTestId('form-error')).not.toBeInTheDocument()
  })
})

describe('preventing double submit', () => {
  it('disables the button while submitting', async () => {
    let resolve: (() => void) | undefined
    const onSubmit = vi.fn(() => new Promise<void>(r => { resolve = r }))
    renderWithRouter(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')

    const btn = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(btn)

    expect(btn).toBeDisabled()
    await act(async () => { resolve?.() })
  })

  it('calls onSubmit only once even if submit is triggered twice', async () => {
    let resolve: (() => void) | undefined
    const onSubmit = vi.fn(() => new Promise<void>(r => { resolve = r }))
    renderWithRouter(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')

    const btn = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(btn)
    await userEvent.click(btn) // button is disabled, second click is ignored

    expect(onSubmit).toHaveBeenCalledTimes(1)
    await act(async () => { resolve?.() })
  })
})

describe('API error handling', () => {
  // Hook sets form error to err.message when err is an Error instance, otherwise
  // falls back to the default message. The mocks below all reject with plain
  // objects, so all four hit the fallback regardless of status code.

  it('uses the fallback message when 401 is rejected as a plain object', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 401, message: 'HTTP 401' })
    renderWithRouter(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent('אימייל או סיסמה שגויים')
    )
  })

  it('uses the fallback message when 423 is rejected as a plain object', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 423, message: 'HTTP 423' })
    renderWithRouter(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent('אימייל או סיסמה שגויים')
    )
  })

  it('uses the fallback message when 5xx is rejected as a plain object', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 500, message: 'Server Error' })
    renderWithRouter(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent('אימייל או סיסמה שגויים')
    )
  })

  it('uses the fallback message when network error (status 0) is rejected as a plain object', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 0, message: 'Network error' })
    renderWithRouter(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent('אימייל או סיסמה שגויים')
    )
  })
})
