'use strict'

// ---------------------------------------------------------------------------
// Mock knex before requiring the repository.
//
// getMonthlyEntries builds this chain:
//   knex('work_entries')
//     .join(...)
//     .join(...)
//     .join(...)
//     .where(...)
//     .andWhere(...)
//     .andWhere(...)
//     .whereNull(...)
//     .select(...)
//     .orderBy(...)
//     .orderBy(...)
//
// Every method returns the same builder object so chaining works regardless
// of call order.  The final .orderBy() call resolves the promise (the
// awaited value), so mockOrderBy is the one we control per test.
// ---------------------------------------------------------------------------

const mockOrderBy = jest.fn()
const mockSelect = jest.fn(() => ({ orderBy: mockOrderBy }))
const mockWhereNull = jest.fn(() => ({ select: mockSelect }))
const mockAndWhere = jest.fn()
const mockWhere = jest.fn(() => ({ andWhere: mockAndWhere }))
const mockJoin = jest.fn()

// orderBy is called twice (date asc, start_time asc); the second call is the
// one awaited.  Return a fresh chainable object on the first call so the
// second call can be set up independently.
const mockOrderBy2 = jest.fn()
mockOrderBy.mockImplementation(() => ({ orderBy: mockOrderBy2 }))

// andWhere is also called twice; each returns something that supports the
// next method in the chain.
mockAndWhere.mockImplementation(() => ({
  andWhere: mockAndWhere,
  whereNull: mockWhereNull,
}))

// join is called three times; each returns something that supports the next
// method in the chain.
mockJoin.mockImplementation(() => ({
  join: mockJoin,
  where: mockWhere,
}))

const mockKnex = jest.fn(() => ({ join: mockJoin }))

jest.mock('../db/knex', () => mockKnex)

const { getMonthlyEntries } = require('./workEntryRepository')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()

  // Re-apply default chain implementations after clearAllMocks wipes them.
  mockJoin.mockImplementation(() => ({ join: mockJoin, where: mockWhere }))
  mockAndWhere.mockImplementation(() => ({
    andWhere: mockAndWhere,
    whereNull: mockWhereNull,
  }))
  mockWhereNull.mockImplementation(() => ({ select: mockSelect }))
  mockSelect.mockImplementation(() => ({ orderBy: mockOrderBy }))
  mockOrderBy.mockImplementation(() => ({ orderBy: mockOrderBy2 }))
  mockOrderBy2.mockResolvedValue([]) // default: empty result
})

// ---------------------------------------------------------------------------
// getMonthlyEntries — correct month filtering
// ---------------------------------------------------------------------------

describe('getMonthlyEntries', () => {
  test('returns entries that belong to the requested month', async () => {
    const may2025Entry = {
      id: 1,
      user_id: 7,
      task_id: 3,
      date: '2025-05-15',
      location: 'office',
      start_time: '09:00:00',
      end_time: '18:00:00',
      duration_hours: '9.00',
      description: null,
      deleted_at: null,
      task_name: 'Dev work',
      project_name: 'Alpha',
      client_name: 'Acme',
    }

    mockOrderBy2.mockResolvedValueOnce([may2025Entry])

    const result = await getMonthlyEntries(7, '2025-05')

    // Check the table targeted
    expect(mockKnex).toHaveBeenCalledWith('work_entries')

    // Check date-range filter boundaries
    expect(mockAndWhere).toHaveBeenCalledWith('work_entries.date', '>=', '2025-05-01')
    expect(mockAndWhere).toHaveBeenCalledWith('work_entries.date', '<=', '2025-05-31')

    // Check user filter
    expect(mockWhere).toHaveBeenCalledWith('work_entries.user_id', 7)

    // Result is the array returned by the chain
    expect(result).toEqual([may2025Entry])
  })

  test('filters by the correct month boundaries for a 28-day month (Feb non-leap year)', async () => {
    mockOrderBy2.mockResolvedValueOnce([])

    await getMonthlyEntries(1, '2025-02')

    expect(mockAndWhere).toHaveBeenCalledWith('work_entries.date', '>=', '2025-02-01')
    expect(mockAndWhere).toHaveBeenCalledWith('work_entries.date', '<=', '2025-02-28')
  })

  test('filters by the correct month boundaries for a 29-day month (Feb leap year)', async () => {
    mockOrderBy2.mockResolvedValueOnce([])

    await getMonthlyEntries(1, '2024-02')

    expect(mockAndWhere).toHaveBeenCalledWith('work_entries.date', '>=', '2024-02-01')
    expect(mockAndWhere).toHaveBeenCalledWith('work_entries.date', '<=', '2024-02-29')
  })

  // ---------------------------------------------------------------------------
  // Soft-delete exclusion
  // ---------------------------------------------------------------------------

  test('excludes soft-deleted entries by filtering whereNull(deleted_at)', async () => {
    mockOrderBy2.mockResolvedValueOnce([])

    await getMonthlyEntries(7, '2025-05')

    expect(mockWhereNull).toHaveBeenCalledWith('work_entries.deleted_at')
  })

  // ---------------------------------------------------------------------------
  // Empty result for a month with no entries
  // ---------------------------------------------------------------------------

  test('returns an empty array when there are no entries for the month', async () => {
    mockOrderBy2.mockResolvedValueOnce([])

    const result = await getMonthlyEntries(7, '2025-06')

    expect(result).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // Join verification — client, project and task names must be present
  // ---------------------------------------------------------------------------

  test('joins tasks, projects, and clients tables', async () => {
    mockOrderBy2.mockResolvedValueOnce([])

    await getMonthlyEntries(7, '2025-05')

    // join() is called three times; verify all three join targets appear
    const joinCalls = mockJoin.mock.calls
    const joinedTables = joinCalls.map((args) => args[0])
    expect(joinedTables).toContain('tasks')
    expect(joinedTables).toContain('projects')
    expect(joinedTables).toContain('clients')
  })

  test('selects task_name, project_name, and client_name aliases', async () => {
    mockOrderBy2.mockResolvedValueOnce([])

    await getMonthlyEntries(7, '2025-05')

    const selectArgs = mockSelect.mock.calls[0]
    expect(selectArgs).toContain('tasks.name as task_name')
    expect(selectArgs).toContain('projects.name as project_name')
    expect(selectArgs).toContain('clients.name as client_name')
    expect(selectArgs).toContain('work_entries.*')
  })
})
