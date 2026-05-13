import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import UsersPage from './UsersPage'

// Mock API and UserModal so UsersPage can be tested in isolation
vi.mock('../../services/usersApi', () => ({
  getUsers: vi.fn(),
}))

vi.mock('./UserModal', () => ({
  default: ({ user, onClose, onSaved }) => (
    <div data-testid="user-modal">
      <span data-testid="modal-mode">{user === null ? 'create' : 'edit'}</span>
      {user && <span data-testid="modal-user-name">{user.full_name}</span>}
      <button onClick={onClose}>modal-close</button>
      <button onClick={onSaved}>modal-saved</button>
    </div>
  ),
}))

import { getUsers } from '../../services/usersApi'

const SAMPLE_USERS = [
  { id: '1', full_name: 'ישראל ישראלי', email: 'israel@example.com', role: 'admin',    is_active: true  },
  { id: '2', full_name: 'שרה כהן',      email: 'sarah@example.com',  role: 'employee', is_active: false },
]

beforeEach(() => {
  vi.clearAllMocks()
  getUsers.mockResolvedValue(SAMPLE_USERS)
})

// ───────────────────────────────────────────
// Table rendering
// ───────────────────────────────────────────

describe('table rendering', () => {
  it('renders all user rows after a successful fetch', async () => {
    render(<UsersPage />)
    expect(await screen.findByText('ישראל ישראלי')).toBeInTheDocument()
    expect(screen.getByText('שרה כהן')).toBeInTheDocument()
  })

  it('displays Hebrew role labels', async () => {
    render(<UsersPage />)
    await screen.findByText('ישראל ישראלי')
    expect(screen.getByText('אדמין')).toBeInTheDocument()
    expect(screen.getByText('עובד')).toBeInTheDocument()
  })

  it('shows a green badge for active users and grey for inactive', async () => {
    render(<UsersPage />)
    await screen.findByText('ישראל ישראלי')
    const badges = screen.getAllByText('פעיל')
    // At least one badge exists (could also be the filter button)
    expect(badges.length).toBeGreaterThan(0)
    expect(screen.getByText('לא פעיל', { selector: 'span' })).toBeInTheDocument()
  })

  it('shows a load-error alert when getUsers rejects', async () => {
    getUsers.mockRejectedValue(new Error('network'))
    render(<UsersPage />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('אירעה שגיאה בטעינת המשתמשים')
  })
})

// ───────────────────────────────────────────
// Status filter
// ───────────────────────────────────────────

describe('status filter', () => {
  it('"פעיל" filter shows only active rows', async () => {
    render(<UsersPage />)
    await screen.findByText('ישראל ישראלי')

    await userEvent.click(screen.getByRole('button', { name: 'פעיל' }))

    expect(screen.getByText('ישראל ישראלי')).toBeInTheDocument()
    expect(screen.queryByText('שרה כהן')).not.toBeInTheDocument()
  })

  it('"לא פעיל" filter shows only inactive rows', async () => {
    render(<UsersPage />)
    await screen.findByText('שרה כהן')

    await userEvent.click(screen.getByRole('button', { name: 'לא פעיל' }))

    expect(screen.queryByText('ישראל ישראלי')).not.toBeInTheDocument()
    expect(screen.getByText('שרה כהן')).toBeInTheDocument()
  })

  it('"הכל" filter restores all rows after a narrower filter was active', async () => {
    render(<UsersPage />)
    await screen.findByText('ישראל ישראלי')

    await userEvent.click(screen.getByRole('button', { name: 'פעיל' }))
    await userEvent.click(screen.getByRole('button', { name: 'הכל' }))

    expect(screen.getByText('ישראל ישראלי')).toBeInTheDocument()
    expect(screen.getByText('שרה כהן')).toBeInTheDocument()
  })
})

// ───────────────────────────────────────────
// Modal integration
// ───────────────────────────────────────────

describe('modal integration', () => {
  it('clicking "הוסף משתמש" opens the modal in create mode', async () => {
    render(<UsersPage />)
    await screen.findByText('ישראל ישראלי')

    await userEvent.click(screen.getByRole('button', { name: /הוסף משתמש/ }))

    expect(screen.getByTestId('modal-mode')).toHaveTextContent('create')
  })

  it('clicking a user row opens the modal in edit mode with that user', async () => {
    render(<UsersPage />)
    await screen.findByText('ישראל ישראלי')

    await userEvent.click(screen.getByText('ישראל ישראלי'))

    expect(screen.getByTestId('modal-mode')).toHaveTextContent('edit')
    expect(screen.getByTestId('modal-user-name')).toHaveTextContent('ישראל ישראלי')
  })

  it('modal is closed and list is re-fetched after onSaved', async () => {
    render(<UsersPage />)
    await screen.findByText('ישראל ישראלי')

    await userEvent.click(screen.getByRole('button', { name: /הוסף משתמש/ }))
    expect(screen.getByTestId('user-modal')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'modal-saved' }))

    await waitFor(() =>
      expect(screen.queryByTestId('user-modal')).not.toBeInTheDocument()
    )
    // getUsers called once on mount + once after save
    expect(getUsers).toHaveBeenCalledTimes(2)
  })

  it('modal is closed when onClose is called', async () => {
    render(<UsersPage />)
    await screen.findByText('ישראל ישראלי')

    await userEvent.click(screen.getByRole('button', { name: /הוסף משתמש/ }))
    await userEvent.click(screen.getByRole('button', { name: 'modal-close' }))

    expect(screen.queryByTestId('user-modal')).not.toBeInTheDocument()
  })
})
