import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

interface RenderWithRouterOptions {
  initialEntries?: string[]
}

// Render `ui` inside a MemoryRouter so router hooks work in tests
export function renderWithRouter(ui: ReactNode, { initialEntries = ['/'] }: RenderWithRouterOptions = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  )
}
