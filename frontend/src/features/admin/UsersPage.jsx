import { useState, useEffect } from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'
import UserModal from './UserModal'
import { getUsers } from '../../services/usersApi'

const FILTERS = [
  { key: 'all',      label: 'הכל' },
  { key: 'active',   label: 'פעיל' },
  { key: 'inactive', label: 'לא פעיל' },
]

// Admin page — lists all users with status filter and add/edit modal
export default function UsersPage() {
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter]       = useState('all')
  // undefined = closed, null = create mode, object = edit mode
  const [modalUser, setModalUser] = useState(undefined)

  // Fetch the full user list; called on mount and after each save
  async function fetchUsers() {
    setLoading(true)
    setLoadError('')
    try {
      const data = await getUsers()
      setUsers(data)
    } catch {
      setLoadError('אירעה שגיאה בטעינת המשתמשים. נסה לרענן.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const filteredUsers = users.filter(u => {
    if (filter === 'active')   return u.is_active === true
    if (filter === 'inactive') return u.is_active === false
    return true
  })

  // Close modal and refresh the list after a save or deactivate
  function handleSaved() {
    setModalUser(undefined)
    fetchUsers()
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Top bar: filter pills + add button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={[
                'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium min-h-[36px] transition-colors',
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setModalUser(null)}
          className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium min-h-[36px] bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          + הוסף משתמש
        </button>
      </div>

      {/* States: loading / error / table */}
      {loading && <LoadingSpinner />}

      {!loading && loadError && (
        <p role="alert" className="text-red-500 text-sm text-center py-6">
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table dir="rtl" className="w-full text-sm text-right">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-gray-500 font-medium">שם מלא</th>
                <th className="px-4 py-3 text-gray-500 font-medium">אימייל</th>
                <th className="px-4 py-3 text-gray-500 font-medium">תפקיד</th>
                <th className="px-4 py-3 text-gray-500 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr
                  key={user.id}
                  onClick={() => setModalUser(user)}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{user.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.role === 'admin' ? 'אדמין' : 'עובד'}
                  </td>
                  <td className="px-4 py-3">
                    {user.is_active
                      ? <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">פעיל</span>
                      : <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-xs font-medium">לא פעיל</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal — create (modalUser===null) or edit (modalUser===object) */}
      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
