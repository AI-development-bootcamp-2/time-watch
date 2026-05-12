import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AdminRoute from './components/AdminRoute'
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
        {/* Login bypassed — redirect straight to daily report */}
        <Route path="/login" element={<Navigate to="/daily" replace />} />
        <Route path="/" element={<Navigate to="/daily" replace />} />

        <Route element={<Layout />}>
          <Route path="/daily"    element={<DailyReportPage />} />
          <Route path="/monthly"  element={<MonthlyCalendar />} />
          <Route path="/absences" element={<AbsencePage />} />

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

        <Route path="*" element={<Navigate to="/daily" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
