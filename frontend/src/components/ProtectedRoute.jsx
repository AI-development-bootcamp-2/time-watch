import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isLoading, user } = useAuth()

  if (isLoading) return null

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
