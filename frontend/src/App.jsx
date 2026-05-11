import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DailyReportPage from './features/daily-reporting/DailyReportPage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import PrivateRoute from './features/auth/PrivateRoute.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/daily-report"
          element={
            <PrivateRoute>
              <DailyReportPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/daily-report" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
