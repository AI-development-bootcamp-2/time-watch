import { createContext, useEffect, useState } from 'react'
import { login as apiLogin, logout as apiLogout, getMe } from '../services/authApi'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email, password) {
    const { full_name, ...rest } = await apiLogin(email, password)
    const user = { ...rest, name: full_name }
    setUser(user)
    return user
  }

  async function logout() {
    try {
      await apiLogout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
