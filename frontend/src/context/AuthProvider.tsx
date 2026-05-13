import { createContext, useEffect, useState, type ReactNode } from 'react'
import { login as apiLogin, logout as apiLogout, getMe } from '../services/authApi'

export interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'regular'
  must_change_password?: boolean
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  patchUser: (patch: Partial<User>) => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getMe()
      // getMe returns Promise<unknown>; cast to User — will be removable when authApi
      // return types are narrowed in a later batch
      .then(data => setUser(data as User))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string): Promise<User> {
    // apiLogin returns Promise<unknown>; cast matches the AuthContextType contract
    const user = await apiLogin(email, password) as User
    setUser(user)
    return user
  }

  async function logout(): Promise<void> {
    try {
      await apiLogout()
    } finally {
      setUser(null)
    }
  }

  // Merge a partial update into the current user without a round-trip to /api/auth/me
  function patchUser(patch: Partial<User>): void {
    setUser(prev => prev ? { ...prev, ...patch } as User : null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, patchUser }}>
      {children}
    </AuthContext.Provider>
  )
}
