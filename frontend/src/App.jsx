import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import DailyReportPage from './features/daily-reporting/DailyReportPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/" element={<DailyReportPage />} />
      </Routes>
    </BrowserRouter>
  )
}
