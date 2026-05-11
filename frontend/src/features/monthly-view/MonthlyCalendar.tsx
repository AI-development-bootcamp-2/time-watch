import { useState, useEffect } from 'react'
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isAfter,
  startOfToday,
  getDay,
  parseISO,
} from 'date-fns'
import { he } from 'date-fns/locale'
import { HebrewCalendar } from '@hebcal/core'

import EntryList, { type Entry } from './EntryList'
import EditEntryModal from './EditEntryModal'

// ─── Types ───────────────────────────────────────────────────────────────────

type DayStatus = 'full' | 'missing' | 'exceptional' | 'weekend' | 'future' | 'holiday'

interface DayData {
  date: string
  status: DayStatus
  totalHours: number
  entries: Entry[]
  absence: unknown | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BG: Record<DayStatus, string> = {
  full:        'bg-green-400',
  missing:     'bg-red-400',
  exceptional: 'bg-orange-400',
  weekend:     'bg-gray-200',
  holiday:     'bg-gray-200',
  future:      'bg-gray-100',
}

const STATUS_TEXT: Record<DayStatus, string> = {
  full:        'text-white',
  missing:     'text-white',
  exceptional: 'text-white',
  weekend:     'text-gray-400',
  holiday:     'text-gray-400',
  future:      'text-gray-300',
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function getJewishHolidays(year: number, month: number): Set<string> {
  const events = HebrewCalendar.calendar({
    year,
    month,
    isHebrewYear: false,
    il: true,
    noMinorFast: true,
    noModern: true,
    noRoshChodesh: true,
  } as object)
  const holidays = new Set<string>()
  for (const ev of events) {
    const d = ev.getDate().greg()
    holidays.add(format(d, 'yyyy-MM-dd'))
  }
  return holidays
}

function buildCalendarWeeks(days: Date[], firstDow: number): (Date | null)[][] {
  const weeks: (Date | null)[][] = []
  let week: (Date | null)[] = Array(firstDow).fill(null)
  for (const day of days) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function FutureMonthEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <svg viewBox="0 0 200 180" className="w-48 h-auto mb-6 opacity-80" fill="none">
        {/* desk / backdrop */}
        <ellipse cx="100" cy="155" rx="72" ry="12" fill="#E5E5EA" />
        {/* calendar body */}
        <rect x="54" y="80" width="68" height="62" rx="6" fill="#fff" stroke="#D1D1D6" strokeWidth="2"/>
        <rect x="54" y="80" width="68" height="16" rx="6" fill="#D1D1D6"/>
        {/* calendar grid lines */}
        <line x1="64" y1="106" x2="64" y2="135" stroke="#E5E5EA" strokeWidth="1.5"/>
        <line x1="78" y1="106" x2="78" y2="135" stroke="#E5E5EA" strokeWidth="1.5"/>
        <line x1="92" y1="106" x2="92" y2="135" stroke="#E5E5EA" strokeWidth="1.5"/>
        <line x1="106" y1="106" x2="106" y2="135" stroke="#E5E5EA" strokeWidth="1.5"/>
        <line x1="54" y1="115" x2="122" y2="115" stroke="#E5E5EA" strokeWidth="1.5"/>
        <line x1="54" y1="124" x2="122" y2="124" stroke="#E5E5EA" strokeWidth="1.5"/>
        {/* X marks */}
        <path d="M67 108 l4 4 m0-4 l-4 4" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M81 117 l4 4 m0-4 l-4 4" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M95 108 l4 4 m0-4 l-4 4" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round"/>
        {/* clock */}
        <circle cx="138" cy="90" r="26" fill="#fff" stroke="#D1D1D6" strokeWidth="2"/>
        <circle cx="138" cy="90" r="2" fill="#8E8E93"/>
        <line x1="138" y1="90" x2="138" y2="72" stroke="#3A3A3C" strokeWidth="2" strokeLinecap="round"/>
        <line x1="138" y1="90" x2="150" y2="98" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round"/>
        {/* person silhouette */}
        <circle cx="96" cy="62" r="12" fill="#C7C7CC"/>
        <path d="M76 100 Q88 78 96 74 Q104 78 116 100" fill="#C7C7CC"/>
        {/* plant */}
        <rect x="44" y="130" width="10" height="20" rx="2" fill="#C7C7CC"/>
        <ellipse cx="49" cy="122" rx="10" ry="14" fill="#A8A8A8"/>
        <ellipse cx="40" cy="128" rx="7" ry="10" fill="#B0B0B0"/>
      </svg>

      <p className="text-lg font-semibold text-gray-700 mb-2">
        לא הגענו לחודש הזה 😊
      </p>
      <p className="text-sm text-gray-400 max-w-xs">
        תן לזמן לעשות את שלו — ואז תוכל לדווח גם כאן.
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MonthlyCalendar() {
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()))
  const [dayDataMap, setDayDataMap] = useState<Record<string, DayData>>({})
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const isLocked = false

  const monthStr = format(currentDate, 'yyyy-MM')
  const isFutureMonth = isAfter(currentDate, startOfMonth(startOfToday()))

  // Fetch monthly data from API
  useEffect(() => {
    if (isFutureMonth) return
    setLoading(true)
    fetch(`/api/work-entries?month=${monthStr}`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, DayData> = {}
        for (const day of data.days ?? []) map[day.date] = day
        setDayDataMap(map)
      })
      .catch(() => setDayDataMap({}))
      .finally(() => setLoading(false))
  }, [monthStr, isFutureMonth])

  // Build calendar grid
  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
  const firstDow = getDay(days[0]) // 0=Sun … 6=Sat
  const weeks = buildCalendarWeeks(days, firstDow)

  // Jewish holidays for this month
  const holidays = getJewishHolidays(currentDate.getFullYear(), currentDate.getMonth() + 1)

  function getDayStatus(day: Date): DayStatus {
    const dateStr = format(day, 'yyyy-MM-dd')
    if (isAfter(day, startOfToday())) return 'future'
    const dow = getDay(day)
    if (dow === 5 || dow === 6) return 'weekend'
    if (holidays.has(dateStr)) return 'holiday'
    const data = dayDataMap[dateStr]
    if (!data) return loading ? 'future' : 'missing'
    return data.status as DayStatus
  }

  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: he })
  const todayMonth = format(startOfMonth(new Date()), 'yyyy-MM')

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: '#F2F2F7' }}>

      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm text-gray-600 active:scale-95 transition-transform"
          aria-label="חודש קודם"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-base font-semibold text-gray-800 capitalize">{monthLabel}</span>
          {monthStr !== todayMonth && (
            <button
              onClick={() => setCurrentDate(startOfMonth(new Date()))}
              className="text-xs text-blue-500 mt-0.5"
            >
              לחודש הנוכחי
            </button>
          )}
        </div>

        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm text-gray-600 active:scale-95 transition-transform"
          aria-label="חודש הבא"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Future month empty state */}
      {isFutureMonth ? (
        <FutureMonthEmpty />
      ) : (
        <div className="px-2 pb-4">
          {/* Calendar grid */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAY_NAMES.map((name) => (
                <div key={name} className="py-2 text-center text-[11px] font-medium text-gray-400">
                  {name.slice(0, 1)}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  if (!day) return <div key={di} className="aspect-square" />
                  const status = getDayStatus(day)
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const data = dayDataMap[dateStr]
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

                  const isSelected = dateStr === selectedDate
                  const isClickable = status !== 'weekend' && status !== 'holiday' && status !== 'future'

                  return (
                    <div
                      key={di}
                      onClick={() => isClickable && setSelectedDate(isSelected ? null : dateStr)}
                      className={[
                        'aspect-square flex flex-col items-center justify-center gap-0.5 m-0.5 rounded-xl transition-all',
                        STATUS_BG[status],
                        STATUS_TEXT[status],
                        isToday ? 'ring-2 ring-blue-500 ring-offset-1' : '',
                        isSelected ? 'ring-2 ring-blue-600 ring-offset-1 scale-95' : '',
                        isClickable ? 'cursor-pointer active:scale-90' : '',
                      ].join(' ')}
                    >
                      <span className="text-xs font-semibold leading-none">
                        {format(day, 'd')}
                      </span>
                      {data && status !== 'weekend' && status !== 'holiday' && (
                        <span className="text-[9px] leading-none opacity-80">
                          {data.totalHours}ש׳
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mb-4 text-xs text-gray-500">
            {[
              { color: 'bg-green-400',  label: 'יום מלא' },
              { color: 'bg-red-400',    label: 'חסר' },
              { color: 'bg-orange-400', label: 'חריג' },
              { color: 'bg-gray-200',   label: 'סוף שבוע / חג' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded-full ${color}`} />
                {label}
              </div>
            ))}
          </div>

          {/* Entry list */}
          <div className="px-2">
            {selectedDate && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">
                  {format(parseISO(selectedDate), 'EEEE, d בMMMM', { locale: he })}
                </span>
                <button onClick={() => setSelectedDate(null)} className="text-xs text-blue-500">
                  כל החודש
                </button>
              </div>
            )}
            <EntryList
              entries={Object.values(dayDataMap).flatMap((d) => d.entries)}
              selectedDate={selectedDate}
              isLocked={isLocked}
              onEdit={setEditingEntry}
            />
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={(updated) => {
            setDayDataMap((prev) => {
              const day = prev[updated.date]
              if (!day) return prev
              return {
                ...prev,
                [updated.date]: {
                  ...day,
                  entries: day.entries.map((e) => (e.id === updated.id ? updated : e)),
                },
              }
            })
            setEditingEntry(null)
          }}
        />
      )}
    </div>
  )
}
