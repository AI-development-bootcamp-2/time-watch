import { useState, useRef } from 'react'
import {
  IconClose,
  IconInfo,
  IconUpload,
  IconFile,
  IconCalendar,
  IconAlertTriangle,
} from './absenceIcons'

/** Absence types with Hebrew labels and metadata */
const ABSENCE_TYPES = [
  { value: 'vacation',    label: 'חופשה',          requiresDoc: false },
  { value: 'half_vacation_day', label: 'חצי יום חופש', requiresDoc: false },
  { value: 'sick',       label: 'מחלה',            requiresDoc: true  },
  { value: 'reserve',   label: 'מילואים',          requiresDoc: true  },
]

/**
 * Count working days between two dates (excluding Fri=5, Sat=6).
 * Returns 0 if dates are invalid / end < start.
 */
function countWorkDays(startStr, endStr) {
  if (!startStr || !endStr) return 0
  const start = new Date(startStr)
  const end   = new Date(endStr)
  if (isNaN(start) || isNaN(end) || end < start) return 0

  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay() // 0=Sun … 6=Sat
    if (day !== 5 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

const EMPTY_FORM = {
  type:        '',
  duration:    'single', // 'single' | 'range'
  startDate:   '',
  endDate:     '',
  isPartial:   false,
  partialFrom: '',
  partialTo:   '',
  notes:       '',
  document:    null,
}

/** Maps error keys to Hebrew messages */
function validate(values) {
  const errs = {}
  if (!values.type)      errs.type      = 'יש לבחור סוג היעדרות'
  if (!values.startDate) errs.startDate = 'יש לבחור תאריך'
  if (values.duration === 'range') {
    if (!values.endDate) errs.endDate = 'יש לבחור תאריך סיום'
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      errs.endDate = 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה'
    }
  }
  if (values.isPartial) {
    if (!values.partialFrom) errs.partialFrom = 'יש להזין שעת התחלה'
    if (!values.partialTo)   errs.partialTo   = 'יש להזין שעת סיום'
    if (values.partialFrom && values.partialTo && values.partialTo <= values.partialFrom) {
      errs.partialTo = 'שעת הסיום חייבת להיות אחרי שעת ההתחלה'
    }
  }
  return errs
}

/**
 * AbsenceForm — modal/drawer for creating a new absence record.
 *
 * Props:
 *   onClose()                  — called when user cancels / closes
 *   onSave(absence)            — called with the new absence object
 *   initialValues (optional)   — pre-fill for edit mode
 */
export default function AbsenceForm({ onClose, onSave, initialValues }) {
  const [values, setValues] = useState({ ...EMPTY_FORM, ...initialValues })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const selectedType = ABSENCE_TYPES.find(t => t.value === values.type)
  const requiresDoc  = selectedType?.requiresDoc ?? false
  const workDays     = countWorkDays(values.startDate, values.endDate)

  /* ---- Handlers ---- */
  function handleChange(e) {
    const { name, value, type: inputType, checked } = e.target
    setValues(prev => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value,
    }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] ?? null
    setValues(prev => ({ ...prev, document: file }))
  }

  function handleRemoveFile() {
    setValues(prev => ({ ...prev, document: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(values)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setIsSubmitting(true)
    try {
      // Build absence payload
      const absence = {
        id:          Date.now(), // replaced by backend ID in real integration
        type:        values.type,
        startDate:   values.startDate,
        endDate:     values.duration === 'single' ? values.startDate : values.endDate,
        workDays,
        isPartial:   values.isPartial,
        partialFrom: values.isPartial ? values.partialFrom : null,
        partialTo:   values.isPartial ? values.partialTo   : null,
        notes:       values.notes,
        document:    values.document,
      }
      await onSave(absence)
      onClose()
    } catch {
      setErrors(prev => ({ ...prev, form: 'שמירה נכשלה. אנא נסה שוב.' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ---- Render ---- */
  return (
    <div
      className="absence-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="absence-modal-title"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absence-modal">
        {/* Drag handle (mobile) */}
        <div className="absence-modal-handle" aria-hidden="true" />

        {/* Header */}
        <div className="absence-modal-header">
          <h2 id="absence-modal-title" className="absence-modal-title">
            {initialValues ? 'עריכת היעדרות' : 'דיווח היעדרות חדשה'}
          </h2>
          <button
            type="button"
            className="absence-modal-close"
            aria-label="סגור"
            onClick={onClose}
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <form
          className="absence-modal-body"
          onSubmit={handleSubmit}
          noValidate
          dir="rtl"
        >
          {/* Type */}
          <div className="af-field">
            <label className="af-label" htmlFor="af-type">
              סוג היעדרות <span className="af-required" aria-hidden="true">*</span>
            </label>
            <div className="af-select-wrap">
              <select
                id="af-type"
                name="type"
                className="af-select"
                value={values.type}
                onChange={handleChange}
                aria-required="true"
                aria-invalid={!!errors.type}
                aria-describedby={errors.type ? 'af-type-error' : undefined}
              >
                <option value="">בחר סוג היעדרות</option>
                {ABSENCE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {errors.type && (
              <p id="af-type-error" className="af-error" role="alert">{errors.type}</p>
            )}
          </div>

          {/* Duration */}
          <div className="af-field">
            <label className="af-label" htmlFor="af-duration">משך</label>
            <div className="af-select-wrap">
              <select
                id="af-duration"
                name="duration"
                className="af-select"
                value={values.duration}
                onChange={handleChange}
              >
                <option value="single">יום אחד</option>
                <option value="range">מספר ימים</option>
              </select>
            </div>
          </div>

          {/* Date range */}
          <div className="af-field">
            <label className="af-label">
              {values.duration === 'single' ? <>תאריך <span className="af-required" aria-hidden="true">*</span></> : <>טווח תאריכים <span className="af-required" aria-hidden="true">*</span></>}
            </label>
            <div className="af-date-row">
              <div className="af-field">
                <label className="af-label" htmlFor="af-startDate">{values.duration === 'single' ? 'תאריך' : 'מתאריך'}</label>
                <input
                  id="af-startDate"
                  name="startDate"
                  type="date"
                  className="af-input"
                  value={values.startDate}
                  onChange={handleChange}
                  aria-required="true"
                  aria-invalid={!!errors.startDate}
                  aria-describedby={errors.startDate ? 'af-startDate-error' : undefined}
                />
                {errors.startDate && (
                  <p id="af-startDate-error" className="af-error" role="alert">{errors.startDate}</p>
                )}
              </div>
              {values.duration === 'range' && (
                <div className="af-field">
                  <label className="af-label" htmlFor="af-endDate">עד תאריך</label>
                  <input
                    id="af-endDate"
                    name="endDate"
                    type="date"
                    className="af-input"
                    value={values.endDate}
                    onChange={handleChange}
                    aria-required="true"
                    aria-invalid={!!errors.endDate}
                    aria-describedby={errors.endDate ? 'af-endDate-error' : undefined}
                  />
                  {errors.endDate && (
                    <p id="af-endDate-error" className="af-error" role="alert">{errors.endDate}</p>
                  )}
                </div>
              )}
            </div>

            {/* Excluded days notice */}
            {values.startDate && values.endDate && !errors.startDate && !errors.endDate && (
              <div className="af-excluded-notice">
                <IconCalendar />
                <span>
                  {workDays > 0
                    ? `סה"כ ${workDays} ימי עבודה (שישי ושבת אינם נכללים)`
                    : 'הטווח שנבחר אינו כולל ימי עבודה (שישי ושבת מוחרגים)'}
                </span>
              </div>
            )}
          </div>

          {/* Partial day toggle */}
          <div className="af-toggle-row">
            <div className="af-toggle-label-group">
              <span className="af-toggle-title">היעדרות חלקית</span>
              <span className="af-toggle-desc">לחלק מהיום בלבד</span>
            </div>
            <label className="af-toggle" aria-label="היעדרות חלקית">
              <input
                type="checkbox"
                name="isPartial"
                checked={values.isPartial}
                onChange={handleChange}
              />
              <span className="af-toggle-slider" />
            </label>
          </div>

          {/* Partial hours (shown only when partial is on) */}
          {values.isPartial && (
            <div className="af-partial-hours-row">
              <p className="af-partial-hours-note">
                <IconInfo />
                יש להשלים דיווח שעות לשאר היום
              </p>
              <div className="af-field">
                <label className="af-label" htmlFor="af-partialFrom">שעת התחלה</label>
                <input
                  id="af-partialFrom"
                  name="partialFrom"
                  type="time"
                  className="af-input"
                  value={values.partialFrom}
                  onChange={handleChange}
                  aria-invalid={!!errors.partialFrom}
                  aria-describedby={errors.partialFrom ? 'af-partialFrom-error' : undefined}
                />
                {errors.partialFrom && (
                  <p id="af-partialFrom-error" className="af-error" role="alert">{errors.partialFrom}</p>
                )}
              </div>
              <div className="af-field">
                <label className="af-label" htmlFor="af-partialTo">שעת סיום</label>
                <input
                  id="af-partialTo"
                  name="partialTo"
                  type="time"
                  className="af-input"
                  value={values.partialTo}
                  onChange={handleChange}
                  aria-invalid={!!errors.partialTo}
                  aria-describedby={errors.partialTo ? 'af-partialTo-error' : undefined}
                />
                {errors.partialTo && (
                  <p id="af-partialTo-error" className="af-error" role="alert">{errors.partialTo}</p>
                )}
              </div>
            </div>
          )}

          {/* Document upload (required for sick / reserve) */}
          {values.type && (
            <div className="af-field">
              <label className="af-label">
                {requiresDoc
                  ? <>מסמך תומך <span className="af-required" aria-hidden="true">*</span> <span style={{ fontWeight: 400, color: '#848891' }}>(ניתן להגיש לאחר הדיווח)</span></>
                  : 'מסמך מצורף (אופציונלי)'}
              </label>

              {values.document ? (
                <div className="af-upload-file-selected">
                  <IconFile />
                  <span className="af-upload-file-name">{values.document.name}</span>
                  <button
                    type="button"
                    className="af-upload-remove"
                    onClick={handleRemoveFile}
                    aria-label="הסר קובץ"
                  >
                    הסר
                  </button>
                </div>
              ) : (
                <label className="af-upload-area" tabIndex={0}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    aria-label="העלאת מסמך"
                  />
                  <div className="af-upload-icon" aria-hidden="true">
                    <IconUpload />
                  </div>
                  <p className="af-upload-text-main">לחץ להעלאת קובץ</p>
                  <p className="af-upload-text-sub">PDF, JPG, PNG עד 10MB</p>
                </label>
              )}

              {requiresDoc && !values.document && (
                <div className="af-upload-later-note">
                  <IconInfo />
                  מסמך נדרש עבור {selectedType?.label}. ניתן להגיש גם לאחר שמירת הדיווח.
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="af-field">
            <label className="af-label" htmlFor="af-notes">הערות (אופציונלי)</label>
            <textarea
              id="af-notes"
              name="notes"
              className="af-textarea"
              value={values.notes}
              onChange={handleChange}
              placeholder="הוסף הערה..."
              rows={3}
            />
          </div>

          {/* Form-level error */}
          {errors.form && (
            <div className="absence-card-alert warning" role="alert">
              <IconAlertTriangle />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Actions */}
          <div className="af-submit-row">
            <button
              type="submit"
              className="af-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'שומר...' : initialValues ? 'שמור שינויים' : 'שמור דיווח'}
            </button>
            <button
              type="button"
              className="af-cancel-btn"
              onClick={onClose}
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
