import { useState } from 'react';

type TimerStatus = 'idle' | 'loading' | 'running';

export default function TimerWidget() {
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/timer/start', { method: 'POST' });

      if (res.status === 201) {
        setStatus('running');
        return;
      }

      if (res.status === 409) {
        setError('יש כבר טיימר פעיל');
      } else {
        setError('שגיאה בהפעלת הטיימר');
      }

      setStatus('idle');
    } catch {
      setError('שגיאה בהפעלת הטיימר');
      setStatus('idle');
    }
  }

  if (status === 'running') {
    return <div>טיימר פעיל...</div>;
  }

  return (
    <div dir="rtl" className="rounded-2xl shadow p-6 bg-white">
      <button
        type="button"
        onClick={handleStart}
        disabled={status === 'loading'}
        className="w-full py-4 text-xl font-bold rounded-2xl bg-green-500 text-white active:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'מתחיל...' : 'התחל עבודה'}
      </button>

      {error && (
        <p className="mt-3 text-red-600 text-sm text-center">{error}</p>
      )}
    </div>
  );
}
