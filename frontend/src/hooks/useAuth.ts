import { useContext } from 'react'
import { AuthContext, type User, type AuthContextType } from '../context/AuthProvider'

export type { User, AuthContextType }

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (ctx === null) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
