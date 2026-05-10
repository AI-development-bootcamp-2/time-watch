import { createContext, useContext, useState } from 'react'
import { login as apiLogin, logout as apiLogout } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  async function login(credentials) {
    const data = await apiLogin(credentials)
    setUser(data)
    return data
  }

  async function logout() {
    await apiLogout()
    setUser(null)
  }

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
