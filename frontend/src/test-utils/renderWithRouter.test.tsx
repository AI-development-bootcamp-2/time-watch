import { screen } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { renderWithRouter } from './renderWithRouter'
import { renderWithAuth, renderWithRouter as barrelRouter } from './index'

function LocationDisplay() {
  const { pathname } = useLocation()
  return <span data-testid="path">{pathname}</span>
}

describe('renderWithRouter', () => {
  it('provides router context so useLocation works', () => {
    renderWithRouter(<LocationDisplay />)
    expect(screen.getByTestId('path')).toBeInTheDocument()
  })

  it('defaults initial path to /', () => {
    renderWithRouter(<LocationDisplay />)
    expect(screen.getByTestId('path')).toHaveTextContent('/')
  })

  it('uses provided initialEntries path', () => {
    renderWithRouter(<LocationDisplay />, { initialEntries: ['/login'] })
    expect(screen.getByTestId('path')).toHaveTextContent('/login')
  })

  it('uses the last entry in initialEntries as the active route', () => {
    renderWithRouter(<LocationDisplay />, { initialEntries: ['/a', '/b', '/admin'] })
    expect(screen.getByTestId('path')).toHaveTextContent('/admin')
  })
})

describe('barrel (index.js) re-exports', () => {
  it('exports renderWithAuth from the barrel', () => {
    expect(typeof renderWithAuth).toBe('function')
  })

  it('exports renderWithRouter from the barrel', () => {
    expect(typeof barrelRouter).toBe('function')
  })
})
