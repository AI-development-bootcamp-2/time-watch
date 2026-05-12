import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import AbsenceForm from './AbsenceForm'
import {
  IconChevronRight,
  IconChevronLeft,
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlertTriangle,
  IconInfo,
  IconCalendar,
  IconClock,
  IconPaperclip,
  IconFile,
} from './absenceIcons'
import './AbsencePage.css'

/* ---- Hebrew month names ---- */
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

/* ---- Type metadata ---- */
const TYPE_META = {
  vacation:         { label: 'חופשה',          badgeClass: 'badge-vacation',      emoji: '🏖' },
  half_vacation_day:{ label: 'חצי יום חופש',  badgeClass: 'badge-half-vacation', emoji: '🌤' },
  sick:             { label: 'מחלה',           badgeClass: 'badge-sick',          emoji: '🤒' },
  military_reserve: { label: 'מילואים',        badgeClass: 'badge-reserve',       emoji: '🪖' },
}

/* ---- Helpers ---- */
function formatDate(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d)) return isoStr
  return `${d.getDate()} ${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function absenceBelongsToMonth(absence, year, month) {
  const inRange = (isoStr) => {
    const d = new Date(isoStr)
    return d.getFullYear() === year && d.getMonth() === month
  }
  return inRange(absence.startDate) || inRange(absence.endDate)
}

function computeSummary(absences) {
  const days = { vacation: 0, half_vacation_day: 0, sick: 0, military_reserve: 0 }
  absences.forEach(a => {
    if (days[a.type] !== undefined) days[a.type] += (a.workDays || 0)
  })
  return days
}

/* ---- Mock data (replace with API) ---- */
const MOCK_ABSENCES = [
  {
    id: 1,
    type: 'vacation',
    startDate: '2026-05-04',
    endDate:   '2026-05-08',
    workDays:  5,
    isPartial: false,
    notes: 'חופשת קיץ',
    document: null,
  },
  {
    id: 2,
    type: 'sick',
    startDate: '2026-05-12',
    endDate:   '2026-05-12',
    workDays:  1,
    isPartial: true,
    partialFrom: '08:00',
    partialTo:   '13:00',
    notes: '',
    document: null,
  },
  {
    id: 3,
    type: 'military_reserve',
    startDate: '2026-05-19',
    endDate:   '2026-05-28',
    workDays:  8,
    isPartial: false,
    notes: '',
    document: { name: 'orders.pdf' },
  },
]

/* ============================================================
   AbsencePage
   ============================================================ */
export default function AbsencePage() {
  const today = new Date()
  const [year,       setYear]       = useState(today.getFullYear())
  const [month,      setMonth]      = useState(today.getMonth())
  const [absences,   setAbsences]   = useState(MOCK_ABSENCES)
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteId,   setDeleteId]   = useState(null)

  /* Month navigation */
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  /* Derived data */
  const visibleAbsences = useMemo(
    () => absences.filter(a => absenceBelongsToMonth(a, year, month)),
    [absences, year, month]
  )
  const summary = useMemo(() => computeSummary(visibleAbsences), [visibleAbsences])

  /* CRUD */
  function handleSave(absence) {
    if (editTarget) {
      setAbsences(prev => prev.map(a => a.id === editTarget.id ? { ...absence, id: editTarget.id } : a))
    } else {
      setAbsences(prev => [...prev, absence])
    }
    setEditTarget(null)
  }

  function handleEdit(absence) {
    setEditTarget(absence)
    setShowForm(true)
  }

  function handleDeleteConfirm() {
    setAbsences(prev => prev.filter(a => a.id !== deleteId))
    setDeleteId(null)
  }

  function openNewForm() {
    setEditTarget(null)
    setShowForm(true)
  }

  function handleUploadForAbsence(absenceId, file) {
    setAbsences(prev => prev.map(a =>
      a.id === absenceId ? { ...a, document: file } : a
    ))
  }

  /* ---- Render ---- */
  return (
    <div className="absence-page" dir="rtl">

      {/* Header */}
      <header className="absence-header">
        <div className="absence-header-top">
          <img src="/abra-logo.png" alt="abra" className="absence-header-logo" />
          <h1 className="absence-header-title">היעדרויות</h1>
        </div>
        <nav className="absence-header-nav" aria-label="ניווט ראשי">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <button type="button" className="absence-nav-tab">דף הבית</button>
          </Link>
          <Link to="/report" style={{ textDecoration: 'none' }}>
            <button type="button" className="absence-nav-tab">דיווח שעות</button>
          </Link>
          <button type="button" className="absence-nav-tab active" aria-current="page">
            היעדרויות
          </button>
        </nav>
      </header>

      {/* Month Navigator */}
      <div className="absence-month-nav" role="navigation" aria-label="ניווט חודש">
        <button
          type="button"
          className="absence-month-btn"
          onClick={prevMonth}
          aria-label="חודש קודם"
        >
          <IconChevronRight />
        </button>
        <span className="absence-month-label">
          {HEBREW_MONTHS[month]} {year}
        </span>
        <button
          type="button"
          className="absence-month-btn"
          onClick={nextMonth}
          aria-label="חודש הבא"
        >
          <IconChevronLeft />
        </button>
      </div>

      {/* Main */}
      <main className="absence-content">

        {/* Summary */}
        <section aria-label="סיכום היעדרויות לחודש">
          <div className="absence-summary-row">
            <div className="absence-summary-card vacation">
              <span className="absence-summary-count">{summary.vacation}</span>
              <span className="absence-summary-label">ימי חופשה</span>
            </div>
            <div className="absence-summary-card sick">
              <span className="absence-summary-count">{summary.sick}</span>
              <span className="absence-summary-label">ימי מחלה</span>
            </div>
            <div className="absence-summary-card reserve">
              <span className="absence-summary-count">{summary.military_reserve}</span>
              <span className="absence-summary-label">ימי מילואים</span>
            </div>
          </div>
        </section>

        {/* List */}
        <section aria-label="רשימת היעדרויות">
          <h2 className="absence-section-title">
            היעדרויות — {HEBREW_MONTHS[month]} {year}
          </h2>

          {visibleAbsences.length === 0 ? (
            <div className="absence-list-empty" role="status">
              אין היעדרויות מדווחות לחודש זה
            </div>
          ) : (
            <ul className="absence-list" role="list">
              {visibleAbsences.map(absence => (
                <AbsenceCard
                  key={absence.id}
                  absence={absence}
                  onEdit={() => handleEdit(absence)}
                  onDelete={() => setDeleteId(absence.id)}
                  onUpload={(file) => handleUploadForAbsence(absence.id, file)}
                />
              ))}
            </ul>
          )}
        </section>

      </main>

      {/* FAB */}
      <button
        type="button"
        className="absence-fab"
        onClick={openNewForm}
        aria-label="הוסף היעדרות חדשה"
      >
        <IconPlus />
      </button>

      {/* Form modal */}
      {showForm && (
        <AbsenceForm
          key={editTarget?.id ?? 'new'}
          initialValues={editTarget ?? undefined}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSave={handleSave}
        />
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <DeleteConfirmDialog
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}

/* ============================================================
   AbsenceCard
   ============================================================ */
function AbsenceCard({ absence, onEdit, onDelete, onUpload }) {
  const meta        = TYPE_META[absence.type] ?? TYPE_META.other
  const fileInputRef = useRef(null)
  const requiresDoc  = absence.type === 'sick' || absence.type === 'reserve'
  const missingDoc   = requiresDoc && !absence.document

  function handleFileInput(e) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
  }

  const isSameDay = absence.startDate === absence.endDate

  return (
    <li className="absence-card" role="listitem">
      {/* Header */}
      <div className="absence-card-header">
        <span className={`absence-card-type-badge ${meta.badgeClass}`} aria-label={`סוג: ${meta.label}`}>
          <span aria-hidden="true">{meta.emoji}</span>
          {meta.label}
          {absence.isPartial && (
            <span className="absence-partial-chip" style={{ marginInlineStart: 6 }}>חלקי</span>
          )}
        </span>
        <div className="absence-card-actions">
          <button
            type="button"
            className="absence-card-action-btn"
            onClick={onEdit}
            aria-label={`ערוך היעדרות ${meta.label}`}
          >
            <IconEdit />
          </button>
          <button
            type="button"
            className="absence-card-action-btn delete"
            onClick={onDelete}
            aria-label={`מחק היעדרות ${meta.label}`}
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="absence-card-body">
        {/* Date range */}
        <div className="absence-card-dates">
          <IconCalendar />
          {isSameDay
            ? formatDate(absence.startDate)
            : (
              <>
                {formatDate(absence.startDate)}
                <span className="absence-card-dates-sep">—</span>
                {formatDate(absence.endDate)}
              </>
            )
          }
        </div>

        {/* Meta row */}
        <div className="absence-card-meta-row">
          <span className="absence-card-meta-item">
            <IconCalendar />
            <strong>{absence.workDays}</strong>&nbsp;ימי עבודה
          </span>
          {absence.isPartial && absence.partialFrom && absence.partialTo && (
            <span className="absence-card-meta-item">
              <IconClock />
              {absence.partialFrom} – {absence.partialTo}
            </span>
          )}
        </div>

        {/* Notes */}
        {absence.notes ? (
          <p style={{ fontSize: 13, color: '#848891', margin: 0 }}>{absence.notes}</p>
        ) : null}

        {/* Partial-day reminder */}
        {absence.isPartial && (
          <div className="absence-card-alert info">
            <IconInfo />
            <span>היעדרות חלקית — נדרש דיווח שעות לשאר היום</span>
          </div>
        )}

        {/* Missing doc warning */}
        {missingDoc && (
          <div className="absence-card-upload">
            <span className="absence-card-upload-label">
              <IconPaperclip />
              מסמך {meta.label} עדיין לא הועלה
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={handleFileInput}
              aria-label={`העלאת מסמך עבור ${meta.label}`}
            />
            <button
              type="button"
              className="absence-card-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              העלה עכשיו
            </button>
          </div>
        )}

        {/* Document attached */}
        {absence.document && (
          <div className="absence-card-upload">
            <span className="absence-card-upload-filename">
              <IconFile />
              <span>
                {typeof absence.document === 'object'
                  ? absence.document.name
                  : absence.document}
              </span>
            </span>
            <button
              type="button"
              className="absence-card-upload-btn"
              aria-label="פתח מסמך"
            >
              צפה
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

/* ============================================================
   DeleteConfirmDialog
   ============================================================ */
function DeleteConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div
      className="absence-modal-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="absence-modal" style={{ maxHeight: 'unset', paddingBottom: 24 }}>
        <div className="absence-modal-handle" aria-hidden="true" />
        <div className="absence-modal-header">
          <h2 id="delete-dialog-title" className="absence-modal-title">מחיקת היעדרות</h2>
        </div>
        <div className="absence-modal-body">
          <div className="absence-card-alert warning">
            <IconAlertTriangle />
            <span>האם אתה בטוח שברצונך למחוק היעדרות זו? פעולה זו אינה ניתנת לביטול.</span>
          </div>
          <div className="af-submit-row">
            <button
              type="button"
              className="af-submit-btn"
              style={{ background: '#DC2626' }}
              onClick={onConfirm}
            >
              כן, מחק
            </button>
            <button
              type="button"
              className="af-cancel-btn"
              onClick={onCancel}
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
