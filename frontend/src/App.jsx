import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DailyReportPage from './features/daily-reporting/DailyReportPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/daily-report" element={<DailyReportPage />} />
        <Route path="/" element={<Navigate to="/daily-report" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
