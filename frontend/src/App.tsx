import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LoginPage from './features/auth/LoginPage'
import ChangePasswordPage from './features/auth/ChangePasswordPage'
import AdminLayout from './features/admin/AdminLayout'
import DailyReportPage from './features/daily-reporting/DailyReportPage'
import MonthlyCalendar from './features/monthly-view/MonthlyCalendar'
import AbsencePage from './features/absences/AbsencePage'
import UsersPage from './features/admin/UsersPage'
import ClientsPage from './features/admin/ClientsPage'
import ProjectsPage from './features/admin/ProjectsPage'
import TasksPage from './features/admin/TasksPage'
import AdminReportsPage from './features/admin/AdminReportsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/daily" replace />} />

        {/* Authenticated routes — ProtectedRoute redirects to /login when no session */}
        <Route element={<ProtectedRoute />}>
          {/* Force password change on first login — rendered without Layout (no nav) */}
          <Route path="/change-password" element={<ChangePasswordPage />} />

          <Route element={<Layout />}>
            <Route path="/daily"    element={<DailyReportPage />} />
            <Route path="/monthly"  element={<MonthlyCalendar />} />
            <Route path="/absences" element={<AbsencePage />} />

            {/* Admin-only routes — AdminRoute redirects employees to / */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="users" replace />} />
                <Route path="users"    element={<UsersPage />} />
                <Route path="clients"  element={<ClientsPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="tasks"    element={<TasksPage />} />
                <Route path="reports"  element={<AdminReportsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        {/* Fallback: any unknown path → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
