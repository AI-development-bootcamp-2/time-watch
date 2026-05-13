import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StopTimerModal from '../features/daily-reporting/StopTimerModal'

// ─── Bottom nav items ─────────────────────────────────────────────────────────

const NAV_ITEMS: { to: string; label: string; end?: boolean; adminOnly?: boolean; icon: ReactNode }[] = [
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
    to: '/admin',
    end: false,
    label: 'ניהול',
    adminOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth() as { user: { role: string } | null; logout: () => Promise<void> }

  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStarting, setTimerStarting] = useState(false)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [showStopModal, setShowStopModal] = useState(false)

  // Sync with any active timer on mount
  useEffect(() => {
    fetch('/api/timer/status')
      .then(r => r.json())
      .then(data => {
        if (data.timer?.start_time) {
          setStartTime(data.timer.start_time)
          setTimerRunning(true)
        }
      })
      .catch(() => {})
  }, [])

  // Tick elapsed counter every second while running
  useEffect(() => {
    if (!timerRunning || !startTime) return
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timerRunning, startTime])

  async function handleStartTimer() {
    if (timerStarting || timerRunning) return
    setTimerStarting(true)
    try {
      const res = await fetch('/api/timer/start', { method: 'POST' })
      if (res.status === 201) {
        const { timer } = await res.json()
        setStartTime(timer.start_time)
        setElapsed(0)
        setTimerRunning(true)
      } else if (res.status === 409) {
        // Already running on server — sync state
        const status = await fetch('/api/timer/status').then(r => r.json())
        if (status.timer?.start_time) {
          setStartTime(status.timer.start_time)
          setTimerRunning(true)
        }
      }
    } catch {
      // ignore network errors
    } finally {
      setTimerStarting(false)
    }
  }

  function handleTimerSaved() {
    setShowStopModal(false)
    setTimerRunning(false)
    setStartTime(null)
    setElapsed(0)
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
            onClick={() => navigate('/daily')}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white min-h-[40px] active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #FFAA00 0%, #FF6D00 100%)',
              boxShadow: '0 4px 12px rgba(255,109,0,0.40)',
            }}
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" fill="rgba(255,255,255,0.25)" stroke="white" />
              <path strokeLinecap="round" stroke="white" d="M16 2v4M8 2v4M3 10h18" />
              <path strokeLinecap="round" stroke="white" strokeWidth={1.8} d="M14 16l-2 1 1-2 3-3 1 1-3 3z" />
            </svg>
            דיווח ידני
          </button>

          {/* Timer button — toggles between start and stop */}
          {timerRunning ? (
            <button
              onClick={() => setShowStopModal(true)}
              className="flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-full text-sm font-bold text-white min-h-[40px] active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg, #FF6B6B 0%, #C0392B 100%)',
                boxShadow: '0 4px 12px rgba(192,57,43,0.40)',
              }}
            >
              <span className="flex items-center gap-1.5">
                {/* Stop square icon */}
                <svg className="w-[14px] h-[14px]" viewBox="0 0 14 14" fill="white">
                  <rect x="2" y="2" width="10" height="10" rx="1.5" />
                </svg>
                הפסקת שעון
              </span>
              <span className="text-[11px] font-mono opacity-90 leading-none tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </button>
          ) : (
            <button
              onClick={handleStartTimer}
              disabled={timerStarting}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white min-h-[40px] active:scale-95 transition-all disabled:opacity-70"
              style={{
                background: 'linear-gradient(135deg, #FF4DB8 0%, #D6006E 100%)',
                boxShadow: '0 4px 12px rgba(214,0,110,0.40)',
              }}
            >
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
          )}
        </div>

        {/* LEFT (RTL flex-end): יציאה */}
        <button
          onClick={async () => { await logout(); navigate('/login') }}
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
        {NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin').map(({ to, label, icon, end }) => (
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

      {/* Stop timer modal — rendered at layout level so it's available from any page */}
      {showStopModal && (
        <StopTimerModal
          onClose={() => setShowStopModal(false)}
          onSaved={handleTimerSaved}
        />
      )}
    </div>
  )
}
