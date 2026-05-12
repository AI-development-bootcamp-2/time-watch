import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner accessibility', () => {
  it('has role="status"', () => {
    render(<LoadingSpinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has Hebrew aria-label', () => {
    render(<LoadingSpinner />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'טוען...')
  })

  it('fullPage variant also has role="status"', () => {
    render(<LoadingSpinner fullPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('fullPage variant also has Hebrew aria-label', () => {
    render(<LoadingSpinner fullPage />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'טוען...')
  })
})

describe('LoadingSpinner fullPage prop', () => {
  it('renders .spinner-overlay wrapper when fullPage=true', () => {
    const { container } = render(<LoadingSpinner fullPage />)
    expect(container.querySelector('.spinner-overlay')).toBeInTheDocument()
    expect(container.querySelector('.spinner-inline')).not.toBeInTheDocument()
  })

  it('renders .spinner-inline wrapper when fullPage is omitted', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.querySelector('.spinner-inline')).toBeInTheDocument()
    expect(container.querySelector('.spinner-overlay')).not.toBeInTheDocument()
  })

  it('renders .spinner-inline wrapper when fullPage=false', () => {
    const { container } = render(<LoadingSpinner fullPage={false} />)
    expect(container.querySelector('.spinner-inline')).toBeInTheDocument()
    expect(container.querySelector('.spinner-overlay')).not.toBeInTheDocument()
  })

  it('always renders the .spinner ring regardless of fullPage', () => {
    const { container: c1 } = render(<LoadingSpinner />)
    const { container: c2 } = render(<LoadingSpinner fullPage />)
    expect(c1.querySelector('.spinner')).toBeInTheDocument()
    expect(c2.querySelector('.spinner')).toBeInTheDocument()
  })
})
