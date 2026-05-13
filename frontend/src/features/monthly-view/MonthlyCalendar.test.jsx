import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('opens the work report form without leaving the monthly page', async () => {
    render(
      <MemoryRouter initialEntries={['/monthly']}>
        <Routes>
          <Route
            path="/monthly"
            element={(
              <>
                <MonthlyCalendar />
                <LocationDisplay />
              </>
            )}
          />
        </Routes>
      </MemoryRouter>,
    )

    const now = new Date()
    const displayDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`
    const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const dayLabel = await waitFor(() => {
      const matches = screen.getAllByText((_, element) => element?.textContent?.includes(displayDate) ?? false)
      const label = matches.find((element) =>
        element.tagName === 'SPAN' && element.className.includes('whitespace-nowrap')
      )
      expect(label).toBeTruthy()
      return label
    })
    fireEvent.click(dayLabel)
    const addReportButton = screen.getAllByRole('button').find((button) => button.textContent?.includes('הוספת דיווח'))

    expect(addReportButton).toBeTruthy()
    fireEvent.click(addReportButton)

    expect(screen.getByTestId('location')).toHaveTextContent(`/monthly?report=work&date=${isoDate}`)
  })
})
