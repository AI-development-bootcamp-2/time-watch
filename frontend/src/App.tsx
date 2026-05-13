import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LoginPage from './features/auth/LoginPage'
import ChangePasswordPage from './features/auth/ChangePasswordPage'
import AdminLayout from './features/admin/AdminLayout'
import DailyReportPage from './features/daily-reporting/DailyReportPage'
import MonthlyCalendar from './features/monthly-view/MonthlyCalendar'
import UsersPage from './features/admin/UsersPage'
import ProjectsPage from './features/admin/ProjectsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/monthly" replace />} />

        {/* Authenticated routes — ProtectedRoute redirects to /login when no session */}
        <Route element={<ProtectedRoute />}>
          {/* Force password change on first login — rendered without Layout (no nav) */}
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* Employee routes — mobile layout with header + bottom nav */}
          <Route element={<Layout />}>
            <Route path="/daily"    element={<DailyReportPage />} />
            <Route path="/monthly"  element={<MonthlyCalendar />} />

          {/* Admin routes — own full-screen layout with dark sidebar */}
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users"    element={<UsersPage />} />
              <Route path="projects" element={<ProjectsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback: any unknown path → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
