import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute() {
  const { isLoading, user } = useAuth()
  const { pathname } = useLocation()

  if (isLoading) return <LoadingSpinner fullPage />

  if (!user) return <Navigate to="/login" replace />

  // Force new users to set their own password before accessing anything else
  if (user.must_change_password && pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}
