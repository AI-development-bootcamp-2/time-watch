import { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../services/authService'
import Spinner from '../components/Spinner'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  async function login(credentials) {
    const data = await apiLogin(credentials)
    setUser(data)
    return data
  }

  async function logout() {
    await apiLogout()
    setUser(null)
  }

  if (isLoading) return <Spinner />

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export default AuthContext
