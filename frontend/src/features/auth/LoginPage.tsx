import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/LoadingSpinner'
import LoginForm from './LoginForm'
import './LoginPage.css'

export default function LoginPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner fullPage />
  if (user) return <Navigate to="/monthly" replace />

  return (
    <div className="login-page">
      <LoginForm />
    </div>
  )
}
