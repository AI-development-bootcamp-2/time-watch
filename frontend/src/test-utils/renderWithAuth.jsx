import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthContext } from '../context/AuthProvider'

export function renderWithAuth(ui, {
  user = null,
  isLoading = false,
  login = vi.fn(),
  logout = vi.fn(),
} = {}) {
  return render(
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {ui}
    </AuthContext.Provider>
  )
}
