import { useState, useEffect } from 'react';
import StopTimerModal from './StopTimerModal';

type TimerStatus = 'idle' | 'loading' | 'running';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

export default function TimerWidget() {
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);

  // Check server status on mount — syncs with any timer started externally (e.g. header button)
  useEffect(() => {
    fetch('/api/timer/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.timer?.start_time) {
          setStartTime(data.timer.start_time)
          setStatus('running')
        }
      })
      .catch(() => {})
  }, [])

  // Elapsed counter — ticks every second while running
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      if (!startTime) return;
      const seconds = Math.floor(
        (Date.now() - new Date(startTime).getTime()) / 1000
      );
      setElapsed(Math.max(0, seconds));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startTime]);

  // Polling — syncs with server every 5 seconds while running
  useEffect(() => {
    if (status !== 'running') return;

    const poll = async () => {
      try {
        const res = await fetch('/api/timer/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data.timer === null) {
          // Timer was stopped externally
          setStatus('idle');
          setStartTime(null);
          setElapsed(0);
        } else if (data.timer?.start_time) {
          setStartTime(data.timer.start_time);
        }
      } catch {
        // Network hiccup — stay in running state, try again next tick
      }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [status]);

  async function handleStart() {
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/timer/start', { method: 'POST' });

      if (res.status === 201) {
        const { timer } = await res.json();
        setStartTime(timer.start_time);
        setElapsed(0);
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
    return (
      <>
        <div dir="rtl" className="rounded-2xl shadow p-6 bg-white">
          <p className="text-5xl font-mono font-bold text-center text-gray-800 my-6">
            {formatElapsed(elapsed)}
          </p>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="w-full py-4 text-xl font-bold rounded-2xl bg-red-500 text-white active:bg-red-700"
          >
            סיום עבודה
          </button>
        </div>

        {showModal && (
          <StopTimerModal
            onClose={() => setShowModal(false)}
            onSaved={() => {
              setShowModal(false);
              setStatus('idle');
              setStartTime(null);
              setElapsed(0);
            }}
          />
        )}
      </>
    );
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
