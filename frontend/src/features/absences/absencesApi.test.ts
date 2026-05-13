import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAbsence, deleteDocument, getAbsences, updateAbsence, uploadDocument } from './absencesApi'

beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ id: 1 }),
  })
})

describe('absencesApi', () => {
  it('uses credentials include for each endpoint', async () => {
    await getAbsences({ month: '2024-01' })
    await createAbsence({ type: 'vacation' })
    await updateAbsence(3, { type: 'sick' })
    await uploadDocument(4, new File(['doc'], 'doc.pdf', { type: 'application/pdf' }))
    await deleteDocument(5)

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/absences?month=2024-01', { credentials: 'include' })
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/absences', expect.objectContaining({ credentials: 'include', method: 'POST' }))
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/absences/3', expect.objectContaining({ credentials: 'include', method: 'PUT' }))
    expect(fetch).toHaveBeenNthCalledWith(4, '/api/absences/4/document', expect.objectContaining({ credentials: 'include', method: 'POST' }))
    expect(fetch).toHaveBeenNthCalledWith(5, '/api/absences/5/document', expect.objectContaining({ credentials: 'include', method: 'DELETE' }))
  })

  it('throws the server message on non-2xx responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 423,
      json: async () => ({ message: 'החודש נעול' }),
    })

    await expect(createAbsence({ type: 'vacation' })).rejects.toThrow('החודש נעול')
  })
})
