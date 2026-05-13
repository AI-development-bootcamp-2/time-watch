import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './authSlice.ts'

/**
 * Route guard: renders `children` only if the user has a valid (non-expired)
 * JWT. Otherwise redirects to /login, preserving the original location so the
 * login flow can send the user back after authenticating.
 */
export default function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
