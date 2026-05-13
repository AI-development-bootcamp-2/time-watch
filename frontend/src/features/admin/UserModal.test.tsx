import { screen, waitFor, act, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import UserModal from './UserModal'

vi.mock('../../services/usersApi', () => ({
  createUser:     vi.fn(),
  updateUser:     vi.fn(),
  deactivateUser: vi.fn(),
}))

import { createUser, updateUser, deactivateUser } from '../../services/usersApi'

const mockedCreateUser = vi.mocked(createUser)
const mockedUpdateUser = vi.mocked(updateUser)
const mockedDeactivateUser = vi.mocked(deactivateUser)

// Test-local user shape — production UserModal expects `id: number` but the
// tests use a string id ('user-1') which is fine at runtime for URL interpolation.
type TestUserRecord = {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
}

interface RenderModalProps {
  user: TestUserRecord | null
  onClose: () => void
  onSaved: () => void
}

const VALID_USER: TestUserRecord = {
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

function renderModal(props: RenderModalProps) {
  // Cast at the boundary — UserModal's prop type narrows id to number, but the
  // test data uses strings. UserModal interpolates the id into a URL via template
  // literals, so the runtime accepts either.
  return render(<UserModal {...(props as unknown as React.ComponentProps<typeof UserModal>)} />)
}

beforeEach(() => { vi.clearAllMocks() })

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
    mockedCreateUser.mockResolvedValue({})
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
    mockedUpdateUser.mockResolvedValue({})
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved: vi.fn() })

    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() => expect(updateUser).toHaveBeenCalled())
    const [, payload] = mockedUpdateUser.mock.calls[0]
    expect(payload).not.toHaveProperty('password')
  })

  it('includes password key in PUT body when password field is non-empty', async () => {
    mockedUpdateUser.mockResolvedValue({})
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved: vi.fn() })

    await userEvent.type(screen.getByLabelText('סיסמה'), 'NewPass1!')
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() => expect(updateUser).toHaveBeenCalled())
    const [, payload] = mockedUpdateUser.mock.calls[0]
    expect(payload).toHaveProperty('password', 'NewPass1!')
  })
})

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

describe('saving state', () => {
  it('save button is disabled and shows "שומר..." during save', async () => {
    let resolve: ((value: unknown) => void) | undefined
    mockedCreateUser.mockReturnValue(new Promise(r => { resolve = r }))
    renderModal({ user: null, onClose: vi.fn(), onSaved: vi.fn() })

    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    expect(screen.getByRole('button', { name: 'שומר...' })).toBeDisabled()
    await act(async () => { resolve?.({}) })
  })
})

describe('API error handling', () => {
  it('shows duplicate-email message on 409', async () => {
    mockedCreateUser.mockRejectedValue({ status: 409 })
    renderModal({ user: null, onClose: vi.fn(), onSaved: vi.fn() })

    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('כתובת האימייל כבר קיימת במערכת')
    )
  })

  it('shows generic error on non-409 API failure', async () => {
    mockedCreateUser.mockRejectedValue({ status: 500 })
    renderModal({ user: null, onClose: vi.fn(), onSaved: vi.fn() })

    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('אירעה שגיאה. נסה שוב.')
    )
  })
})

describe('deactivate', () => {
  it('calls deactivateUser and onSaved on success', async () => {
    mockedDeactivateUser.mockResolvedValue({})
    const onSaved = vi.fn()
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved })

    await userEvent.click(screen.getByRole('button', { name: 'השבת משתמש' }))

    await waitFor(() => expect(deactivateUser).toHaveBeenCalledWith(VALID_USER.id))
    expect(onSaved).toHaveBeenCalled()
  })

  it('shows API error message inline on 400', async () => {
    mockedDeactivateUser.mockRejectedValue({ message: 'לא ניתן להשבית את המנהל האחרון' })
    renderModal({ user: VALID_USER, onClose: vi.fn(), onSaved: vi.fn() })

    await userEvent.click(screen.getByRole('button', { name: 'השבת משתמש' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן להשבית את המנהל האחרון')
    )
  })
})

describe('close resets state', () => {
  it('clears field errors when modal is closed', async () => {
    const onClose = vi.fn()
    renderModal({ user: null, onClose, onSaved: vi.fn() })

    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))
    await waitFor(() =>
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    )

    await userEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('clears API error when modal is closed', async () => {
    mockedCreateUser.mockRejectedValue({ status: 409 })
    const onClose = vi.fn()
    renderModal({ user: null, onClose, onSaved: vi.fn() })

    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: 'שמור' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('כתובת האימייל כבר קיימת במערכת')
    )

    await userEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closing via backdrop calls onClose', async () => {
    const onClose = vi.fn()
    const { container } = renderModal({ user: null, onClose, onSaved: vi.fn() })

    // The backdrop is the outermost div
    await userEvent.click(container.firstChild as Element)
    expect(onClose).toHaveBeenCalled()
  })
})
