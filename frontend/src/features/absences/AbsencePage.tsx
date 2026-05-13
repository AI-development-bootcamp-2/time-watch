import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import AbsenceForm from './AbsenceForm'
import { getAbsences } from './absencesApi'

type AbsenceRecord = {
  id: number
  type: 'vacation' | 'half_vacation_day' | 'half_day_vac' | 'sick' | 'military_reserve'
  start_date: string
  end_date: string
  notes?: string
  document_filename?: string | null
}

export default function AbsencePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [absence, setAbsence] = useState<AbsenceRecord | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [error, setError] = useState('')
  const queryMonth = searchParams.get('month')
  const editMonth = absence?.start_date?.slice(0, 7)
  const reportingMonth = queryMonth || editMonth || null

  useEffect(() => {
    let isMounted = true
    async function loadAbsence() {
      if (!id) return
      setIsLoading(true)
      setError('')
      try {
        const rows = await getAbsences()
        const found = Array.isArray(rows)
          ? rows.find((item: AbsenceRecord) => String(item.id) === id)
          : null
        if (isMounted) {
          if (found) setAbsence(found)
          else setError('דיווח ההיעדרות לא נמצא')
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'טעינת הדיווח נכשלה')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadAbsence()
    return () => {
      isMounted = false
    }
  }, [id])

  if (isLoading) return <LoadingSpinner fullPage />

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen p-4">
        <p role="alert">{error}</p>
        <button type="button" onClick={() => navigate(-1)}>ביטול</button>
      </div>
    )
  }

  return (
    <AbsenceForm
      initialValues={absence ?? undefined}
      reportingMonth={reportingMonth}
      onClose={() => navigate(-1)}
    />
  )
}
