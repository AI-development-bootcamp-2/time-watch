import { useState, useEffect } from 'react';

interface DropdownItem {
  id: number;
  name: string;
}

interface StopTimerModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const LOCATIONS = ['משרד', 'לקוח', 'בית'] as const;
type Location = (typeof LOCATIONS)[number];

export default function StopTimerModal({ onClose, onSaved }: StopTimerModalProps) {
  const [location, setLocation] = useState<Location>('משרד');
  const [description, setDescription] = useState('');

  const [clients, setClients] = useState<DropdownItem[]>([]);
  const [projects, setProjects] = useState<DropdownItem[]>([]);
  const [tasks, setTasks] = useState<DropdownItem[]>([]);

  const [clientId, setClientId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch clients on mount
  useEffect(() => {
    setLoadingClients(true);
    fetch('/api/clients')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((body: { data: DropdownItem[] }) => {
        const list = body.data ?? [];
        setClients(list);
        if (list.length === 1) {
          setClientId(list[0].id);
        }
      })
      .catch(() => setError('שגיאה בטעינת לקוחות'))
      .finally(() => setLoadingClients(false));
  }, []);

  // Fetch projects when clientId changes
  useEffect(() => {
    if (clientId === null) {
      setProjects([]);
      setProjectId(null);
      setTasks([]);
      setTaskId(null);
      return;
    }

    setLoadingProjects(true);
    setProjectId(null);
    setTasks([]);
    setTaskId(null);

    fetch(`/api/projects?client_id=${clientId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((body: { data: DropdownItem[] }) => {
        const list = body.data ?? [];
        setProjects(list);
        if (list.length === 1) {
          setProjectId(list[0].id);
        }
      })
      .catch(() => setError('שגיאה בטעינת פרויקטים'))
      .finally(() => setLoadingProjects(false));
  }, [clientId]);

  // Fetch tasks when projectId changes
  useEffect(() => {
    if (projectId === null) {
      setTasks([]);
      setTaskId(null);
      return;
    }

    setLoadingTasks(true);
    setTaskId(null);

    fetch(`/api/tasks?project_id=${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((body: { data: DropdownItem[] }) => {
        const list = body.data ?? [];
        setTasks(list);
        if (list.length === 1) {
          setTaskId(list[0].id);
        }
      })
      .catch(() => setError('שגיאה בטעינת משימות'))
      .finally(() => setLoadingTasks(false));
  }, [projectId]);

  async function handleSave() {
    if (!taskId || !location) {
      setError('יש לבחור משימה ומיקום');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, location, description }),
      });

      if (res.ok) {
        onSaved();
        return;
      }

      const body = await res.json().catch(() => ({}));
      setError((body as { message?: string }).message ?? 'שגיאה בשמירת הדיווח');
    } catch {
      setError('שגיאה בשמירת הדיווח');
    } finally {
      setSaving(false);
    }
  }

  return (
    // Overlay
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">סיום עבודה</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 overflow-y-auto">

          {/* Location */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-2">מיקום</legend>
            <div className="flex gap-6 justify-end">
              {LOCATIONS.map((loc) => (
                <label
                  key={loc}
                  className="flex items-center gap-1.5 cursor-pointer min-h-[44px] select-none"
                >
                  <span className="text-sm text-gray-700">{loc}</span>
                  <input
                    type="radio"
                    name="location"
                    value={loc}
                    checked={location === loc}
                    onChange={() => setLocation(loc)}
                    className="w-4 h-4 accent-green-500"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          {/* Client dropdown */}
          <div className="space-y-1">
            <label htmlFor="client-select" className="block text-sm font-semibold text-gray-700">
              לקוח
            </label>
            <select
              id="client-select"
              value={clientId ?? ''}
              onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}
              disabled={loadingClients}
              className="w-full border border-gray-300 rounded-lg p-2 text-right bg-white min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">{loadingClients ? 'טוען...' : 'בחר לקוח'}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project dropdown */}
          <div className="space-y-1">
            <label htmlFor="project-select" className="block text-sm font-semibold text-gray-700">
              פרויקט
            </label>
            <select
              id="project-select"
              value={projectId ?? ''}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
              disabled={clientId === null || loadingProjects}
              className="w-full border border-gray-300 rounded-lg p-2 text-right bg-white min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingProjects ? 'טוען...' : clientId === null ? 'בחר לקוח תחילה' : 'בחר פרויקט'}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Task dropdown */}
          <div className="space-y-1">
            <label htmlFor="task-select" className="block text-sm font-semibold text-gray-700">
              משימה
            </label>
            <select
              id="task-select"
              value={taskId ?? ''}
              onChange={(e) => setTaskId(e.target.value ? Number(e.target.value) : null)}
              disabled={projectId === null || loadingTasks}
              className="w-full border border-gray-300 rounded-lg p-2 text-right bg-white min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingTasks ? 'טוען...' : projectId === null ? 'בחר פרויקט תחילה' : 'בחר משימה'}
              </option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="description-input" className="block text-sm font-semibold text-gray-700">
              תיאור
            </label>
            <textarea
              id="description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור עבודה (אופציונלי)"
              className="w-full border border-gray-300 rounded-lg p-2 text-right resize-none h-20"
            />
          </div>

          {/* Inline error */}
          {error && (
            <p role="alert" className="text-red-600 text-sm text-center">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed active:bg-gray-300"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed active:bg-green-700"
          >
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    </div>
  );
}
