import { NavLink, Outlet } from 'react-router-dom'

const adminTabs = [
  { to: '/admin/users',    label: 'משתמשים' },
  { to: '/admin/clients',  label: 'לקוחות' },
  { to: '/admin/projects', label: 'פרויקטים' },
  { to: '/admin/tasks',    label: 'משימות' },
  { to: '/admin/reports',  label: 'דוחות' },
]

export default function AdminLayout() {
  return (
    <div dir="rtl" className="space-y-4">
      {/* Tab bar */}
      <div className="flex overflow-x-auto gap-1 -mx-4 px-4 pb-1 scrollbar-hide">
        {adminTabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium min-h-[36px] flex items-center transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Sub-page content */}
      <Outlet />
    </div>
  )
}
