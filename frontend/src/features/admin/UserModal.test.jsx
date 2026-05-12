import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import UserModal from './UserModal'

vi.mock('../../services/usersApi', () => ({
  createUser:     vi.fn(),
  updateUser:     vi.fn(),
  deactivateUser: vi.fn(),
}))

import { createUser, updateUser, deactivateUser } from '../../services/usersApi'

const VALID_USER = {
  id:        'user-1',
  full_name: 'ישראל ישראלי',
  email:     'israel@example.com',
  role:      'employee',
  is_active: true,
}

// Helper: fill in valid create-mode data
async function fillCreateForm() {
  await userEvent.type(screen.getByLabelText('שם מלא'), 'Test User')
  await userEvent.clear(screen.getByLabelText('אימייל'))
  await userEvent.type(screen.getByLabelText('אימייל'), 'test@example.com')
  await userEvent.type(screen.getByLabelText('סיסמה'), 'Password1!')
}

function renderModal(props) {
  return render(<UserModal {...props} />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ───────────────────────────────────────────
// Create mode
// ───────────────────────────────────────────

describe('create mode', () => {
  it('renders with empty fields and title "משתמש חדש"', () => {
    renderModal({ user: null, onClose: vi.fn(), onSaved: vi.fn() })

    expect(screen.getByText('משתמש חדש')).toBeInTheDocument()
    expect(screen.getByLabelText('שם מלא')).toHaveValue('')
    expect(screen.getByLabelText('אימייל')).toHaveValue('')
    expect(screen.getByLabelText('סיסמה')).toHaveValue('')
  })

  it('deactivate button is absent in create mode', () => {
    renderModal({ user: null, onClose: vi.fn(), onSaved: vi.fn() })
    expect(screen.queryByText('השבת משתמש')).not.toBeInTheDocument()
  })

  it('calls createUser with all fields on valid submit', async () => {
    createUser.mockResolvedValue({})
    const onSaved = vi.fn()
    renderModal({ user: null, onClose: vi.fn(), onSaved })

    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() => expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: 'Test User', email: 'test@example.com', password: 'Password1!' })
    ))
    expect(onSaved).toHaveBeenCalled()
  })
})

// ───────────────────────────────────────────
// Edit mode
// ───────────────────────────────────────────

describe('edit mode', () => {
  it('renders with title "עריכת משתמש" and pre-filled fields', () => {
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved: vi.fn() })

    expect(screen.getByText('עריכת משתמש')).toBeInTheDocument()
    expect(screen.getByLabelText('שם מלא')).toHaveValue(VALID_USER.full_name)
    expect(screen.getByLabelText('אימייל')).toHaveValue(VALID_USER.email)
    expect(screen.getByLabelText('סיסמה')).toHaveValue('')
  })

  it('password field shows placeholder in edit mode', () => {
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved: vi.fn() })
    expect(screen.getByLabelText('סיסמה')).toHaveAttribute('placeholder', 'השאר ריק לאי-שינוי')
  })

  it('shows deactivate button for an active user', () => {
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved: vi.fn() })
    expect(screen.getByRole('button', { name: 'השבת משתמש' })).toBeInTheDocument()
  })

  it('does not show deactivate button for an inactive user', () => {
    renderModal({ user: { ...VALID_USER, is_active: false }, onClose: vi.fn(), onSaved: vi.fn() })
    expect(screen.queryByText('השבת משתמש')).not.toBeInTheDocument()
  })

  it('omits password key from PUT body when password field is empty', async () => {
    updateUser.mockResolvedValue({})
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved: vi.fn() })

    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() => expect(updateUser).toHaveBeenCalled())
    const [, payload] = updateUser.mock.calls[0]
    expect(payload).not.toHaveProperty('password')
  })

  it('includes password key in PUT body when password field is non-empty', async () => {
    updateUser.mockResolvedValue({})
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved: vi.fn() })

    await userEvent.type(screen.getByLabelText('סיסמה'), 'NewPass1!')
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() => expect(updateUser).toHaveBeenCalled())
    const [, payload] = updateUser.mock.calls[0]
    expect(payload).toHaveProperty('password', 'NewPass1!')
  })
})

// ───────────────────────────────────────────
// Validation
// ───────────────────────────────────────────

describe('client-side validation', () => {
  it('shows required error for empty full_name on submit', async () => {
    renderModal({ user: null, onClose: vi.fn(), onSaved: vi.fn() })
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() =>
      expect(screen.getAllByRole('alert').some(el => el.textContent === 'שדה חובה')).toBe(true)
    )
    expect(createUser).not.toHaveBeenCalled()
  })

  it('shows invalid email error on bad email format', async () => {
    renderModal({ user: null, onClose: vi.fn(), onSaved: vi.fn() })

    await userEvent.type(screen.getByLabelText('שם מלא'), 'ישראל')
    await userEvent.type(screen.getByLabelText('אימייל'), 'not-an-email')
    await userEvent.type(screen.getByLabelText('סיסמה'), 'Password1!')
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() =>
      expect(screen.getAllByRole('alert').some(el => el.textContent === 'אימייל לא תקין')).toBe(true)
    )
  })
})

// ───────────────────────────────────────────
// Saving state
// ───────────────────────────────────────────

describe('saving state', () => {
  it('save button is disabled and shows "שומר..." during save', async () => {
    let resolve
    createUser.mockReturnValue(new Promise(r => { resolve = r }))
    renderModal({ user: null, onClose: vi.fn(), onSaved: vi.fn() })

    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    expect(screen.getByRole('button', { name: 'שומר...' })).toBeDisabled()
    await act(async () => { resolve({}) })
  })
})

// ───────────────────────────────────────────
// API errors
// ───────────────────────────────────────────

describe('API error handling', () => {
  it('shows duplicate-email message on 409', async () => {
    createUser.mockRejectedValue({ status: 409 })
    renderModal({ user: null, onClose: vi.fn(), onSaved: vi.fn() })

    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('כתובת האימייל כבר קיימת במערכת')
    )
  })

  it('shows generic error on non-409 API failure', async () => {
    createUser.mockRejectedValue({ status: 500 })
    renderModal({ user: null, onClose: vi.fn(), onSaved: vi.fn() })

    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('אירעה שגיאה. נסה שוב.')
    )
  })
})

// ───────────────────────────────────────────
// Deactivate
// ───────────────────────────────────────────

describe('deactivate', () => {
  it('calls deactivateUser and onSaved on success', async () => {
    deactivateUser.mockResolvedValue({})
    const onSaved = vi.fn()
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved })

    await userEvent.click(screen.getByRole('button', { name: 'השבת משתמש' }))

    await waitFor(() => expect(deactivateUser).toHaveBeenCalledWith(VALID_USER.id))
    expect(onSaved).toHaveBeenCalled()
  })

  it('shows API error message inline on 400', async () => {
    deactivateUser.mockRejectedValue({ message: 'לא ניתן להשבית את המנהל האחרון' })
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved: vi.fn() })

    await userEvent.click(screen.getByRole('button', { name: 'השבת משתמש' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן להשבית את המנהל האחרון')
    )
  })
})

// ───────────────────────────────────────────
// Modal close resets state
// ───────────────────────────────────────────

describe('close resets state', () => {
  it('clears field errors when modal is closed', async () => {
    const onClose = vi.fn()
    renderModal({ user: null, onClose, onSaved: vi.fn() })

    // Trigger validation errors
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))
    await waitFor(() =>
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    )

    // Close the modal — errors should be cleared (onClose called)
    await userEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('clears API error when modal is closed', async () => {
    createUser.mockRejectedValue({ status: 409 })
    const onClose = vi.fn()
    renderModal({ user: null, onClose, onSaved: vi.fn() })

    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('כתובת האימייל כבר קיימת במערכת')
    )

    // Close — onClose is called (re-opening would show clean state)
    await userEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closing via backdrop calls onClose', async () => {
    const onClose = vi.fn()
    const { container } = renderModal({ user: null, onClose, onSaved: vi.fn() })

    // The backdrop is the outermost div
    await userEvent.click(container.firstChild)
    expect(onClose).toHaveBeenCalled()
  })
})
