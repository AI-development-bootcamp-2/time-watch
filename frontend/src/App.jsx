import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './features/auth/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Home</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
