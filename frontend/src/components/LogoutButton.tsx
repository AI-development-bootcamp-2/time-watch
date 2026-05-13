import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LogoutButton() {
  const auth = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await auth.logout()
    navigate('/login', { replace: true })
  }

  return (
    <button onClick={handleLogout}>התנתק</button>
  )
}
