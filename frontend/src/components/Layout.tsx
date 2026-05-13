import type { ReactNode } from 'react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import AbsenceForm, { type AbsencePayload } from '../features/absences/AbsenceForm'

// ─── Bottom nav items ─────────────────────────────────────────────────────────

const NAV_ITEMS: { to: string; label: string; end?: boolean; icon: ReactNode }[] = [
  {
    to: '/daily',
    label: 'דיווח יומי',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    to: '/monthly',
    label: 'לוח חודשי',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/absences',
    label: 'היעדרויות',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path strokeLinecap="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/admin',
    end: false,
    label: 'ניהול',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const navigate = useNavigate()
  const [timerStarting, setTimerStarting] = useState(false)
  const [showAbsenceForm, setShowAbsenceForm] = useState(false)

  async function handleStartTimer() {
    if (timerStarting) return
    setTimerStarting(true)
    try {
      const res = await fetch('/api/timer/start', { method: 'POST' })
      // 201 = started, 409 = already running — both cases go to daily view
      if (res.status === 201 || res.status === 409) {
        navigate('/daily')
      }
    } catch {
      // Network error — still navigate so user sees the widget
      navigate('/daily')
    } finally {
      setTimerStarting(false)
    }
  }

  async function handleSaveAbsence(absence: AbsencePayload) {
    const createRes = await fetch('/api/absences', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: absence.type,
        start_date: absence.startDate,
        end_date: absence.endDate,
        is_partial: false,
        partial_hours: null,
        notes: '',
      }),
    })

    const created = await createRes.json().catch(() => null)
    if (!createRes.ok) {
      throw new Error(created?.error || 'שמירת הדיווח נכשלה')
    }

    if (absence.document instanceof File) {
      const formData = new FormData()
      formData.append('document', absence.document)

      const uploadRes = await fetch(`/api/absences/${created.id}/document`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!uploadRes.ok) {
        const uploadError = await uploadRes.json().catch(() => null)
        throw new Error(uploadError?.error || 'העלאת המסמך נכשלה')
      }
    }

    setShowAbsenceForm(false)
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: '#F2F2F7' }}>

      {/* ── Top header ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 h-16 flex items-center justify-between">

        {/* RIGHT GROUP (RTL flex-start): logo + action buttons together */}
        <div className="flex items-center gap-3">

          <img
            src="/abra-logo.png"
            alt="abra"
            className="h-9 w-auto object-contain"
          />

          {/* Divider */}
          <div className="w-px h-7 bg-gray-200 mx-1" />

          {/* דיווח ידני — orange gradient pill */}
          <button
            onClick={() => setShowAbsenceForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white min-h-[40px] active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #FFAA00 0%, #FF6D00 100%)',
              boxShadow: '0 4px 12px rgba(255,109,0,0.40)',
            }}
          >
            {/* Pencil-on-calendar icon */}
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" fill="rgba(255,255,255,0.25)" stroke="white" />
              <path strokeLinecap="round" stroke="white" d="M16 2v4M8 2v4M3 10h18" />
              <path strokeLinecap="round" stroke="white" strokeWidth={1.8} d="M14 16l-2 1 1-2 3-3 1 1-3 3z" />
            </svg>
            דיווח ידני
          </button>

          {/* הפעלת שעון — pink gradient pill */}
          <button
            onClick={handleStartTimer}
            disabled={timerStarting}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white min-h-[40px] active:scale-95 transition-all disabled:opacity-70"
            style={{
              background: 'linear-gradient(135deg, #FF4DB8 0%, #D6006E 100%)',
              boxShadow: '0 4px 12px rgba(214,0,110,0.40)',
            }}
          >
            {/* Circle-play icon: ring + filled triangle */}
            <span className="relative flex items-center justify-center w-[20px] h-[20px]">
              {timerStarting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-30" cx="12" cy="12" r="10" stroke="white" strokeWidth={3} />
                  <path className="opacity-90" fill="white" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
                  </svg>
                  <svg className="relative w-[10px] h-[10px] mr-[-1px]" viewBox="0 0 10 10" fill="white">
                    <polygon points="2,1 9,5 2,9" />
                  </svg>
                </>
              )}
            </span>
            {timerStarting ? 'מפעיל...' : 'הפעלת שעון'}
          </button>
        </div>

        {/* LEFT (RTL flex-end): יציאה */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 min-h-[40px] px-1 transition-colors"
        >
          יציאה
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </header>

      {/* ── Main content — no max-width constraint, each page owns its layout ── */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* ── Bottom navigation ── */}
      <nav className="fixed bottom-0 right-0 left-0 z-10 bg-white border-t border-gray-200 flex">
        {NAV_ITEMS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end ?? true}
            className={({ isActive }) =>
              [
                'flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] py-2 text-[11px] font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-400',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {showAbsenceForm && (
        <AbsenceForm
          onClose={() => setShowAbsenceForm(false)}
          onSave={handleSaveAbsence}
        />
      )}
    </div>
  )
}
