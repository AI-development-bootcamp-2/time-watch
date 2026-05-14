import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AbsenceForm from './AbsenceForm'
import { createAbsence, deleteDocument, updateAbsence, uploadDocument } from './absencesApi'

type DatePickerMockProps = {
  selected?: Date | null
  onChange: (date: Date | null | [Date | null, Date | null]) => void
  selectsRange?: boolean
  startDate?: Date | null
  endDate?: Date | null
  customInput?: ReactElement<{ label?: string }>
  minDate?: Date
  maxDate?: Date
}

vi.mock('react-datepicker', () => ({
  default: ({ selected, onChange, selectsRange, startDate, endDate, customInput, minDate, maxDate }: DatePickerMockProps) => {
    const label = customInput?.props?.label || 'תאריך'
    if (selectsRange) {
      return (
        <div data-testid="range-datepicker">
          <input
            aria-label="תאריך התחלה"
            value={startDate ? toInputValue(startDate) : ''}
            min={minDate ? toInputValue(minDate) : undefined}
            max={maxDate ? toInputValue(maxDate) : undefined}
            onChange={event => onChange([fromInputValue(event.target.value), endDate || null])}
          />
          <input
            aria-label="תאריך סיום"
            value={endDate ? toInputValue(endDate) : ''}
            min={minDate ? toInputValue(minDate) : undefined}
            max={maxDate ? toInputValue(maxDate) : undefined}
            onChange={event => onChange([startDate || null, fromInputValue(event.target.value)])}
          />
        </div>
      )
    }
    return (
      <input
        aria-label={label}
        data-testid="single-datepicker"
        value={selected ? toInputValue(selected) : ''}
        min={minDate ? toInputValue(minDate) : undefined}
        max={maxDate ? toInputValue(maxDate) : undefined}
        onChange={event => onChange(fromInputValue(event.target.value))}
      />
    )
  },
}))

vi.mock('react-datepicker/dist/react-datepicker.css', () => ({}))

vi.mock('./absencesApi', () => ({
  createAbsence: vi.fn(),
  updateAbsence: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
}))

const mockCreateAbsence = vi.mocked(createAbsence)
const mockUpdateAbsence = vi.mocked(updateAbsence)
const mockUploadDocument = vi.mocked(uploadDocument)
const mockDeleteDocument = vi.mocked(deleteDocument)

function toInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function fromInputValue(value: string) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function mockNoConflict() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ entries: [] }),
  })
}

async function chooseType(label: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'בחירת סוג דיווח' }))
  const typeDialog = screen.getByRole('dialog', { name: 'בחירת סוג דיווח' })
  await user.click(within(typeDialog).getByRole('radio', { name: label }))
  await user.click(within(typeDialog).getByRole('button', { name: 'המשך' }))
}

async function chooseRangeDuration() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'בחירת משך' }))
  const durationDialog = screen.getByRole('dialog', { name: 'בחירת משך' })
  await user.click(within(durationDialog).getByRole('radio', { name: 'מספר ימים' }))
  await user.click(within(durationDialog).getByRole('button', { name: 'המשך' }))
}

async function fillSingleDate(value = '2024-01-15') {
  fireEvent.change(screen.getByTestId('single-datepicker'), { target: { value } })
}

async function submit() {
  await userEvent.click(screen.getByRole('button', { name: /שמירה|שמור שינויים/ }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockNoConflict()
  mockCreateAbsence.mockResolvedValue({ id: 7 })
  mockUpdateAbsence.mockResolvedValue({ id: 7 })
  mockUploadDocument.mockResolvedValue({ id: 7, document_filename: 'doc.pdf' })
  mockDeleteDocument.mockResolvedValue({})
})

describe('AbsenceForm', () => {
  it('shows the document field for sick and military reserve, and hides it for vacation', async () => {
    render(<AbsenceForm />)

    await chooseType('מחלה')
    expect(screen.getByLabelText('העלאת מסמך')).toBeInTheDocument()

    await chooseType('מילואים')
    expect(screen.getByLabelText('העלאת מסמך')).toBeInTheDocument()

    await chooseType('חופשה')
    expect(screen.queryByLabelText('העלאת מסמך')).not.toBeInTheDocument()
  })

  it('shows a future-date error for vacation and blocks the API call', async () => {
    render(<AbsenceForm />)

    await chooseType('חופשה')
    await fillSingleDate('2099-01-15')
    await submit()

    expect(screen.getByText('לא ניתן לדווח תאריך עתידי לסוג היעדרות זה')).toBeInTheDocument()
    expect(mockCreateAbsence).not.toHaveBeenCalled()
  })

  it('blocks submission while any validation error exists', async () => {
    render(<AbsenceForm />)

    await submit()

    expect(screen.getAllByText('שדה חובה').length).toBeGreaterThan(0)
    expect(mockCreateAbsence).not.toHaveBeenCalled()
  })

  it('rejects files larger than 20 MB without submitting', async () => {
    const user = userEvent.setup()
    render(<AbsenceForm />)

    await chooseType('מחלה')
    const bigFile = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(bigFile, 'size', { value: 21 * 1024 * 1024 })
    await user.upload(screen.getByLabelText('העלאת מסמך'), bigFile)
    await fillSingleDate()
    await submit()

    expect(screen.getByText('הקובץ גדול מדי (מקסימום 20MB)')).toBeInTheDocument()
    expect(mockCreateAbsence).not.toHaveBeenCalled()
    expect(mockUploadDocument).not.toHaveBeenCalled()
  })

  it.each(['מחלה', 'מילואים'])('requires a document before submitting %s absence', async label => {
    render(<AbsenceForm />)

    await chooseType(label)
    await fillSingleDate()
    await submit()

    expect(screen.getByText('עליך להעלות מסמך כדי להמשיך')).toBeInTheDocument()
    expect(mockCreateAbsence).not.toHaveBeenCalled()
    expect(mockUploadDocument).not.toHaveBeenCalled()
  })

  it('shows the conflict modal; cancel closes it and replace submits', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [{ id: 1 }] }),
    })
    render(<AbsenceForm />)

    await chooseType('חופשה')
    await fillSingleDate()
    await submit()

    const conflictDialog = screen.getByRole('dialog', { name: 'קיים דיווח שעות ביום זה. האם להחליף?' })
    expect(conflictDialog).toBeInTheDocument()
    await userEvent.click(within(conflictDialog).getByRole('button', { name: 'ביטול' }))
    expect(mockCreateAbsence).not.toHaveBeenCalled()

    await submit()
    const replacementDialog = screen.getByRole('dialog', { name: 'קיים דיווח שעות ביום זה. האם להחליף?' })
    await userEvent.click(within(replacementDialog).getByRole('button', { name: 'החלף' }))
    await waitFor(() => expect(mockCreateAbsence).toHaveBeenCalledTimes(1))
  })

  it('shows a success message and resets the form after a successful submit', async () => {
    render(<AbsenceForm />)

    await chooseType('חופשה')
    await fillSingleDate()
    await submit()

    expect(await screen.findByText('הדיווח נשמר בהצלחה')).toBeInTheDocument()
    expect(screen.getByText('בחר סוג דיווח')).toBeInTheDocument()
  })

  it('shows an API error inline and keeps the form open', async () => {
    mockCreateAbsence.mockRejectedValueOnce(new Error('החודש נעול'))
    render(<AbsenceForm />)

    await chooseType('חופשה')
    await fillSingleDate()
    await submit()

    expect(await screen.findByText('החודש נעול')).toBeInTheDocument()
    expect(screen.getByText('חופשה')).toBeInTheDocument()
  })

  it('submits one-day reports with end_date equal to start_date', async () => {
    render(<AbsenceForm />)

    await chooseType('חופשה')
    await fillSingleDate('2024-01-16')
    await submit()

    await waitFor(() => expect(mockCreateAbsence).toHaveBeenCalled())
    expect(screen.getByTestId('single-datepicker')).toBeInTheDocument()
    expect(screen.queryByLabelText('תאריך סיום')).not.toBeInTheDocument()
    expect(mockCreateAbsence.mock.calls[0][0]).toMatchObject({
      start_date: '2024-01-16',
      end_date: '2024-01-16',
    })
  })

  it('shows both date inputs in range mode', async () => {
    render(<AbsenceForm />)

    await chooseRangeDuration()

    expect(screen.getByLabelText('תאריך התחלה')).toBeInTheDocument()
    expect(screen.getByLabelText('תאריך סיום')).toBeInTheDocument()
  })

  it('blocks ranges that cross calendar months', async () => {
    render(<AbsenceForm />)

    await chooseType('חופשה')
    await chooseRangeDuration()
    fireEvent.change(screen.getByLabelText('תאריך התחלה'), { target: { value: '2024-01-31' } })
    fireEvent.change(screen.getByLabelText('תאריך סיום'), { target: { value: '2024-02-01' } })
    await submit()

    expect(screen.getByText('לא ניתן לדווח טווח תאריכים שחוצה חודשים')).toBeInTheDocument()
    expect(mockCreateAbsence).not.toHaveBeenCalled()
  })

  it('blocks dates outside the reporting month passed from the monthly page', async () => {
    render(<AbsenceForm reportingMonth="2024-02" />)

    await chooseType('חופשה')
    await fillSingleDate('2024-01-31')
    await submit()

    expect(screen.getByText('ניתן לדווח רק על תאריכים בחודש הנבחר')).toBeInTheDocument()
    expect(mockCreateAbsence).not.toHaveBeenCalled()
  })

  it('limits the date picker to the reporting month', async () => {
    render(<AbsenceForm reportingMonth="2024-02" />)

    const picker = screen.getByTestId('single-datepicker')
    expect(picker).toHaveAttribute('min', '2024-02-01')
    expect(picker).toHaveAttribute('max', '2024-02-29')
  })

  it('updates the working-day counter and excludes Friday-Saturday', async () => {
    render(<AbsenceForm />)

    await chooseType('חופשה')
    await chooseRangeDuration()
    fireEvent.change(screen.getByLabelText('תאריך התחלה'), { target: { value: '2024-01-04' } })
    fireEvent.change(screen.getByLabelText('תאריך סיום'), { target: { value: '2024-01-07' } })

    expect(screen.getByText('2 ימי עבודה (ללא שישי–שבת)')).toBeInTheDocument()
  })

  it('forces half vacation day to one day, hides duration, and shows 0.5 working days', async () => {
    render(<AbsenceForm />)

    await chooseType('חצי יום חופש')

    expect(screen.queryByRole('button', { name: 'בחירת משך' })).not.toBeInTheDocument()
    expect(screen.getByText('0.5 ימי עבודה (ללא שישי–שבת)')).toBeInTheDocument()
  })

  it('shows successful document upload status below the filename', async () => {
    const user = userEvent.setup()
    render(<AbsenceForm />)

    await chooseType('מחלה')
    await user.upload(screen.getByLabelText('העלאת מסמך'), new File(['ok'], 'doc.pdf', { type: 'application/pdf' }))
    await fillSingleDate()
    await submit()

    expect(await screen.findByText('הקובץ עלה בהצלחה')).toBeInTheDocument()
    expect(mockUploadDocument).toHaveBeenCalledTimes(1)
  })

  it('shows failed upload status and lets the user remove the failed file', async () => {
    const user = userEvent.setup()
    mockUploadDocument.mockRejectedValueOnce(new Error('upload failed'))
    render(<AbsenceForm />)

    await chooseType('מחלה')
    await user.upload(screen.getByLabelText('העלאת מסמך'), new File(['bad'], 'bad.pdf', { type: 'application/pdf' }))
    await fillSingleDate()
    await submit()

    expect(await screen.findAllByText('אירעה תקלה בטעינת הקובץ')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'הסר קובץ' }))
    expect(screen.getByLabelText('העלאת מסמך')).toBeInTheDocument()
  })

  it('deletes an existing document and clears filename, status, and input', async () => {
    render(<AbsenceForm initialValues={{ id: 9, type: 'sick', start_date: '2024-01-15', end_date: '2024-01-15', document_filename: 'old.pdf' }} />)

    expect(screen.getByText('old.pdf')).toBeInTheDocument()
    expect(screen.getByText('הקובץ עלה בהצלחה')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'הסר קובץ' }))

    await waitFor(() => expect(mockDeleteDocument).toHaveBeenCalledWith(9))
    expect(screen.queryByText('old.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText('הקובץ עלה בהצלחה')).not.toBeInTheDocument()
    expect(screen.getByLabelText('העלאת מסמך')).toBeInTheDocument()
  })
})
