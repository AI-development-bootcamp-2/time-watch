import { format, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'

export interface Entry {
  id: number
  date: string
  start_time: string
  end_time: string
  duration_hours: number
  location: string
  description: string | null
  task_name: string
  project_name: string
  client_name: string
}

interface Props {
  entries: Entry[]
  selectedDate: string | null
  isLocked: boolean
  onEdit: (entry: Entry) => void
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

export default function EntryList({ entries, selectedDate, isLocked, onEdit }: Props) {
  const filtered = selectedDate
    ? entries.filter((e) => e.date === selectedDate)
    : entries

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
        <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
        </svg>
        <p className="text-sm font-medium">אין דיווחים{selectedDate ? ' ליום זה' : ' לחודש זה'}</p>
      </div>
    )
  }

  let lastDate = ''

  return (
    <div className="space-y-1">
      {filtered.map((entry) => {
        const showDateHeader = entry.date !== lastDate
        lastDate = entry.date
        const dateLabel = format(parseISO(entry.date), 'EEEE, d בMMMM', { locale: he })

        return (
          <div key={entry.id}>
            {showDateHeader && (
              <p className="text-xs font-semibold text-gray-400 px-1 pt-3 pb-1 first:pt-0">
                {dateLabel}
              </p>
            )}

            <button
              onClick={() => !isLocked && onEdit(entry)}
              disabled={isLocked}
              className={[
                'w-full text-right bg-white rounded-xl px-4 py-3 shadow-sm',
                'flex items-start gap-3 transition-all',
                isLocked ? 'cursor-default' : 'active:scale-[0.98] hover:shadow-md',
              ].join(' ')}
            >
              {/* Time column */}
              <div className="flex flex-col items-center min-w-[52px] pt-0.5">
                <span className="text-sm font-bold text-gray-800">{formatTime(entry.start_time)}</span>
                <div className="w-px h-4 bg-gray-200 my-0.5" />
                <span className="text-sm font-bold text-gray-800">{formatTime(entry.end_time)}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800 truncate">{entry.client_name}</span>
                  <span className="text-gray-300">›</span>
                  <span className="text-sm text-gray-600 truncate">{entry.project_name}</span>
                  <span className="text-gray-300">›</span>
                  <span className="text-sm text-gray-500 truncate">{entry.task_name}</span>
                </div>
                {entry.description && (
                  <p className="text-xs text-gray-400 truncate">{entry.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-gray-400">{entry.location}</span>
                  <span className="text-[11px] font-medium text-blue-500">{entry.duration_hours}ש׳</span>
                  {isLocked && (
                    <span className="text-[11px] bg-gray-100 text-gray-400 rounded-full px-2 py-0.5">נעול</span>
                  )}
                </div>
              </div>

              {!isLocked && (
                <svg className="w-4 h-4 text-gray-300 mt-1 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
