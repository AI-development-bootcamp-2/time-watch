import { useEffect, useRef, useState } from 'react'
import './ScrollTimePicker.css'

const ITEM_H = 44
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

type Props = {
  value: string // "HH:MM"
  onChange: (val: string) => void
  label?: string
}

// Snap a scroll column to the nearest item and return the index
function snapToNearest(el: HTMLElement): number {
  const idx = Math.round(el.scrollTop / ITEM_H)
  el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
  return idx
}

// Single scrollable drum column
function Drum({
  items,
  selectedIndex,
  onSelect,
}: {
  items: string[]
  selectedIndex: number
  onSelect: (idx: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const settling = useRef(false)

  // Scroll to the selected index whenever it changes externally
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ top: selectedIndex * ITEM_H, behavior: 'smooth' })
  }, [selectedIndex])

  function handleScroll() {
    const el = ref.current
    if (!el || settling.current) return
    settling.current = true
    // Debounce: snap after user stops scrolling
    const t = setTimeout(() => {
      const idx = snapToNearest(el)
      onSelect(idx)
      settling.current = false
    }, 120)
    return () => clearTimeout(t)
  }

  return (
    <div className="stp-drum-wrap">
      <div ref={ref} className="stp-drum" onScroll={handleScroll}>
        {/* top/bottom padding so first/last item can centre */}
        <div className="stp-drum-pad" />
        {items.map((v, i) => (
          <div
            key={v}
            className={`stp-drum-item${i === selectedIndex ? ' stp-drum-item--selected' : ''}`}
            onClick={() => {
              onSelect(i)
              ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
            }}
          >
            {v}
          </div>
        ))}
        <div className="stp-drum-pad" />
      </div>
      {/* selection band */}
      <div className="stp-drum-band" aria-hidden="true" />
    </div>
  )
}

export default function ScrollTimePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false)
  const [hIdx, setHIdx] = useState(0)
  const [mIdx, setMIdx] = useState(0)

  // Parse incoming value into column indices
  useEffect(() => {
    const [h = '09', m = '00'] = (value || '09:00').split(':')
    setHIdx(Math.max(0, Math.min(23, parseInt(h, 10))))
    setMIdx(Math.max(0, Math.min(59, parseInt(m, 10))))
  }, [value])

  function commit(h: number, m: number) {
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  function handleHour(idx: number) {
    setHIdx(idx)
    commit(idx, mIdx)
  }

  function handleMinute(idx: number) {
    setMIdx(idx)
    commit(hIdx, idx)
  }

  function handleDone() {
    setOpen(false)
  }

  const display = value || '--:--'

  return (
    <>
      <button
        type="button"
        className="stp-trigger"
        onClick={() => setOpen(true)}
        aria-label={`${label ?? 'שעה'}: ${display}`}
      >
        {display}
      </button>

      {open && (
        <div
          className="stp-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={label ?? 'בחירת שעה'}
          onClick={e => { if (e.target === e.currentTarget) handleDone() }}
        >
          <div className="stp-sheet">
            <div className="stp-sheet-header">
              <span className="stp-sheet-title">{label ?? 'בחירת שעה'}</span>
              <button type="button" className="stp-done-btn" onClick={handleDone}>
                אישור
              </button>
            </div>

            <div className="stp-drums" dir="ltr">
              <Drum items={MINUTES} selectedIndex={mIdx} onSelect={handleMinute} />
              <span className="stp-colon">:</span>
              <Drum items={HOURS} selectedIndex={hIdx} onSelect={handleHour} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
