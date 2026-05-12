import { useState } from 'react'

interface StopTimerModalProps {
  onClose: () => void
  onSaved: () => void
}

export default function StopTimerModal({ onClose, onSaved }: StopTimerModalProps) {
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description || null }),
      })
      if (res.ok) { onSaved(); return }
      const body = await res.json().catch(() => ({}))
      setError((body as { message?: string }).message ?? 'שגיאה בשמירת הדיווח')
    } catch {
      setError('שגיאה בשמירת הדיווח')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">סיום עבודה</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-500">תוכל להשלים את הפרטים (לקוח, פרויקט, משימה) בהמשך מהלוח החודשי.</p>

          <div className="space-y-1">
            <label htmlFor="desc" className="block text-sm font-semibold text-gray-700">תיאור (אופציונלי)</label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="מה עשית?"
              className="w-full border border-gray-200 rounded-xl p-3 text-right resize-none h-24 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl min-h-[44px] disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 text-white font-bold rounded-xl min-h-[44px] disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #FF4DB8 0%, #D6006E 100%)' }}
          >
            {saving ? 'שומר...' : 'סיים עבודה'}
          </button>
        </div>
      </div>
    </div>
  )
}
