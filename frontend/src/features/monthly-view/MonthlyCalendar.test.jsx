import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import MonthlyCalendar from './MonthlyCalendar'

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}{location.search}</div>
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    json: async () => ({ days: [] }),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MonthlyCalendar absence reporting link', () => {
  it('opens the absence form with the selected month in the query string', async () => {
    render(
      <MemoryRouter initialEntries={['/monthly']}>
        <Routes>
          <Route path="/monthly" element={<MonthlyCalendar />} />
          <Route path="/absences/new" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    )

    const now = new Date()
    const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    fireEvent.click(screen.getByRole('button', { name: 'דיווח היעדרות' }))

    expect(screen.getByTestId('location')).toHaveTextContent(`/absences/new?month=${expectedMonth}`)
  })
})
