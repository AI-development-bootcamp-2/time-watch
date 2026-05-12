import { useState } from 'react'
import InlineError from '../../components/InlineError'
import { validateUserForm } from './validateUserForm'
import { createUser, updateUser, deactivateUser } from '../../services/usersApi'

// Modal for creating a new user (user=null) or editing an existing one (user=object)
export default function UserModal({ user, onClose, onSaved }) {
  const isCreate = user == null

  const [fullName, setFullName]   = useState(user?.full_name ?? '')
  const [email, setEmail]         = useState(user?.email ?? '')
  const [role, setRole]           = useState(user?.role ?? 'employee')
  const [password, setPassword]   = useState('')
  const [isActive, setIsActive]   = useState(user?.is_active ?? true)

  const [fieldErrors, setFieldErrors] = useState({})
  const [apiError, setApiError]       = useState('')
  const [saving, setSaving]           = useState(false)

  // Reset all error state and call the external onClose handler
  function handleClose() {
    setFieldErrors({})
    setApiError('')
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { valid, errors } = validateUserForm(
      { full_name: fullName, email, password },
      isCreate
    )
    if (!valid) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setSaving(true)
    setApiError('')
    try {
      if (isCreate) {
        await createUser({ full_name: fullName, email, role, password, is_active: isActive })
      } else {
        const payload = { full_name: fullName, email, role, is_active: isActive }
        if (password !== '') payload.password = password
        await updateUser(user.id, payload)
      }
      onSaved()
    } catch (err) {
      if (err?.status === 409) {
        setApiError('כתובת האימייל כבר קיימת במערכת')
      } else {
        setApiError('אירעה שגיאה. נסה שוב.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    setApiError('')
    try {
      await deactivateUser(user.id)
      onSaved()
    } catch (err) {
      const msg = err?.message || err?.data?.message
      setApiError(msg || 'אירעה שגיאה. נסה שוב.')
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {isCreate ? 'משתמש חדש' : 'עריכת משתמש'}
          </h2>
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 text-xl"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-5 py-4 space-y-4">
            {apiError && (
              <p role="alert" className="text-red-500 text-sm text-center">{apiError}</p>
            )}

            {/* שם מלא */}
            <div className="space-y-1">
              <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700">
                שם מלא
              </label>
              <input
                id="full_name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-describedby="full_name-error"
              />
              <InlineError id="full_name-error" message={fieldErrors.full_name} />
            </div>

            {/* אימייל */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                אימייל
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-describedby="email-error"
              />
              <InlineError id="email-error" message={fieldErrors.email} />
            </div>

            {/* תפקיד */}
            <div className="space-y-1">
              <label htmlFor="role" className="block text-sm font-semibold text-gray-700">
                תפקיד
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                <option value="employee">עובד</option>
                <option value="admin">אדמין</option>
              </select>
            </div>

            {/* סיסמה */}
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                סיסמה
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isCreate ? '' : 'השאר ריק לאי-שינוי'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-describedby="password-error"
              />
              <InlineError id="password-error" message={fieldErrors.password} />
            </div>

            {/* סטטוס */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">סטטוס</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">{isActive ? 'פעיל' : 'לא פעיל'}</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl min-h-[44px] disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl min-h-[44px] disabled:opacity-50"
              >
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>

            {/* Deactivate button — edit mode only, active users only */}
            {!isCreate && user.is_active && (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={saving}
                className="w-full py-3 border border-red-300 text-red-600 font-bold rounded-xl min-h-[44px] disabled:opacity-50 hover:bg-red-50"
              >
                השבת משתמש
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
