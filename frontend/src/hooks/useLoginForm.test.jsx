import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useLoginForm } from './useLoginForm'
import { AUTH_ERRORS } from '../utils/errorMessages'

function TestForm({ onSubmit = vi.fn(), onSuccess } = {}) {
  const form = useLoginForm({ onSubmit, onSuccess })
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

function renderForm(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn()
  render(<TestForm {...props} onSubmit={onSubmit} />)
  return { onSubmit }
}

beforeEach(() => vi.clearAllMocks())

describe('validate()', () => {
  it('shows REQUIRED_FIELD for empty email on submit', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByTestId('email-error')).toHaveTextContent(AUTH_ERRORS.REQUIRED_FIELD)
  })

  it('shows INVALID_EMAIL for malformed email on submit', async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText('email'), 'notanemail')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByTestId('email-error')).toHaveTextContent(AUTH_ERRORS.INVALID_EMAIL)
  })

  it('shows REQUIRED_FIELD for empty password when email is valid', async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByTestId('password-error')).toHaveTextContent(AUTH_ERRORS.REQUIRED_FIELD)
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

  it('does not clear form-level error when user types', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 401 })
    render(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(screen.getByTestId('form-error')).toBeInTheDocument())

    await userEvent.type(screen.getByLabelText('email'), 'x')
    expect(screen.getByTestId('form-error')).toBeInTheDocument()
  })
})

describe('preventing double submit', () => {
  it('disables the button while submitting', async () => {
    let resolve
    const onSubmit = vi.fn(() => new Promise(r => { resolve = r }))
    render(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')

    const btn = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(btn)

    expect(btn).toBeDisabled()
    await act(async () => { resolve() })
  })

  it('calls onSubmit only once even if submit is triggered twice', async () => {
    let resolve
    const onSubmit = vi.fn(() => new Promise(r => { resolve = r }))
    render(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')

    const btn = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(btn)
    await userEvent.click(btn) // button is disabled, second click is ignored

    expect(onSubmit).toHaveBeenCalledTimes(1)
    await act(async () => { resolve() })
  })
})

describe('focusing first invalid field', () => {
  it('focuses email input when email is empty', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(document.activeElement).toBe(screen.getByLabelText('email'))
  })

  it('focuses password input when only password is empty', async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(document.activeElement).toBe(screen.getByLabelText('password'))
  })

  it('focuses email (not password) when both are empty', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(document.activeElement).toBe(screen.getByLabelText('email'))
  })
})

describe('API error mapping', () => {
  it('maps 401 to WRONG_CREDENTIALS', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 401, message: 'HTTP 401' })
    render(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent(AUTH_ERRORS.WRONG_CREDENTIALS)
    )
  })

  it('maps 423 to ACCOUNT_LOCKED', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 423, message: 'HTTP 423' })
    render(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent(AUTH_ERRORS.ACCOUNT_LOCKED)
    )
  })

  it('maps 5xx to SERVER_ERROR', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 500, message: 'Server Error' })
    render(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent(AUTH_ERRORS.SERVER_ERROR)
    )
  })

  it('maps network error (status 0) to SERVER_ERROR', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 0, message: 'Network error' })
    render(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent(AUTH_ERRORS.SERVER_ERROR)
    )
  })

  it('calls onSuccess with the result on successful submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: 1 })
    const onSuccess = vi.fn()
    render(<TestForm onSubmit={onSubmit} onSuccess={onSuccess} />)
    await userEvent.type(screen.getByLabelText('email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: 1 }))
  })
})
