import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute() {
  const { isLoading, user } = useAuth()

  if (isLoading) return <LoadingSpinner fullPage />

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
