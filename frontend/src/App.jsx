import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './features/auth/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LogoutButton from './components/LogoutButton'
import AbsencePage from './features/absences/AbsencePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Home <LogoutButton /></div>} />
          <Route path="/absences" element={<AbsencePage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/*" element={<div>Admin</div>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
