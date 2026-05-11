import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/Spinner'
import LoginForm from './LoginForm'
import './LoginPage.css'

export default function LoginPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (user) return <Navigate to="/" replace />

  return (
    <div className="login-page">
      <LoginForm />
    </div>
  )
}
