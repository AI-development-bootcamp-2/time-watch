import { useContext, type Context } from 'react'
import { AuthContext } from '../context/AuthProvider'

export interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'regular'
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  patchUser: (patch: Partial<User>) => void
}

// AuthProvider.jsx uses createContext(null) which TypeScript infers as Context<null>.
// Cast to the real runtime type until AuthProvider.jsx is converted to TypeScript.
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext as Context<AuthContextType | null>)
  if (ctx === null) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
