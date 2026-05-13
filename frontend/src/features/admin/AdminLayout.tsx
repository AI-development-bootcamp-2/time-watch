import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  {
    to: '/admin/users',
    label: 'ניהול משתמשים',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path strokeLinecap="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/admin/projects',
    label: 'ניהול פרויקטים',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
]

export default function AdminLayout() {
  const { user, logout } = useAuth() as { user: { name: string; email: string } | null; logout: () => Promise<void> }
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
    : '?'

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div dir="rtl" className="flex min-h-screen bg-[#F2F2F7]">

      {/* ── Dark sidebar (right in RTL) ── */}
      <aside className="w-56 shrink-0 flex flex-col bg-[#1C1B2E] min-h-screen">

        {/* Logo + back to app */}
        <div className="px-5 pt-6 pb-4 space-y-3">
          <img src="/Abra-logo-Dark-BG.jpg" alt="abra" className="h-8 w-auto object-contain" />
          <button
            onClick={() => navigate('/monthly')}
            className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            חזרה לאפליקציה
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white',
                ].join(' ')
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="px-3 pb-5">
          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name ?? ''}</p>
              <p className="text-white/50 text-[11px] truncate">{user?.email ?? ''}</p>
            </div>
            <button
              onClick={handleLogout}
              title="יציאה"
              className="text-white/40 hover:text-white/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content (left in RTL) ── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
