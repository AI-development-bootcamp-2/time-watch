import { render } from '@testing-library/react'
import { vi } from 'vitest'
import type { ReactNode } from 'react'
import { AuthContext } from '../context/AuthProvider'
import type { AuthContextType } from '../context/AuthProvider'

interface RenderWithAuthOptions {
  user?: AuthContextType['user']
  isLoading?: boolean
  login?: AuthContextType['login']
  logout?: AuthContextType['logout']
  patchUser?: AuthContextType['patchUser']
}

// Render `ui` wrapped in a mock AuthContext provider for component tests
export function renderWithAuth(ui: ReactNode, {
  user = null,
  isLoading = false,
  login = vi.fn(),
  logout = vi.fn(),
  patchUser = vi.fn(),
}: RenderWithAuthOptions = {}) {
  return render(
    <AuthContext.Provider value={{ user, isLoading, login, logout, patchUser } as AuthContextType}>
      {ui}
    </AuthContext.Provider>
  )
}
