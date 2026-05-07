---
name: react-component
description: ALWAYS use this skill when asked to create or scaffold a React component, page, form, or UI element. Triggers on requests like "create a component", "add a form", "build a screen", or any new UI feature in the frontend/.
---

## Rules

- Functional components only, no class components
- Hebrew text inline in JSX (RTL — the app is Hebrew-only, `dir="rtl"`)
- Mobile-first styles: start from small screens, use `sm:` / `md:` breakpoints upward
- Extract complex logic into a custom hook in the same file unless it's reused elsewhere
- Use `PropTypes` for prop validation
- Keep fetch/API calls inside a dedicated `useEffect` or custom hook, never inline in JSX

## Structure

```
ComponentName/
  index.jsx       ← component + PropTypes
  useComponentName.js  ← custom hook (if logic is non-trivial)
```

Component template:

```jsx
import PropTypes from 'prop-types';

export default function ComponentName({ propA, onAction }) {
  // state and effects here

  return (
    <div dir="rtl" className="w-full p-4 md:max-w-lg md:mx-auto">
      {/* mobile-first layout */}
    </div>
  );
}

ComponentName.propTypes = {
  propA: PropTypes.string.isRequired,
  onAction: PropTypes.func,
};

ComponentName.defaultProps = {
  onAction: () => {},
};
```

## Example

**Input:** "create a task selector dropdown that filters by project"

**Output:**
```jsx
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

export default function TaskSelector({ projectId, onSelect }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/tasks?projectId=${projectId}`)
      .then(r => r.json())
      .then(setTasks);
  }, [projectId]);

  return (
    <div dir="rtl" className="w-full">
      <label className="block text-sm font-medium mb-1">משימה</label>
      <select
        className="w-full rounded border p-2 text-base"
        onChange={e => onSelect(e.target.value)}
        defaultValue=""
      >
        <option value="" disabled>בחר משימה</option>
        {tasks.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}

TaskSelector.propTypes = {
  projectId: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
};
```
