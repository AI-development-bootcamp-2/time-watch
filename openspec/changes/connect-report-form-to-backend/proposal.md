## Why

The ReportForm UI is fully built but completely disconnected from the backend — submitting a work report only fires a local callback with no data persisted. Additionally, the frontend and backend use incompatible auth mechanisms (frontend sends `Authorization: Bearer` header; backend reads only from HttpOnly cookies), blocking all authenticated API calls from the client.

## What Changes

- Fix auth middleware to accept JWT from both `Authorization: Bearer` header and cookie, so the existing `apiFetch` client works without changes.
- Add `GET /api/tasks/mine` endpoint (no admin role required) that returns the current user's assigned tasks with full client → project → task hierarchy.
- Update `ProjectPicker` component from a 2-level (client → project) to a 3-level (client → project → task) drill-down picker.
- Update `ReportForm` to fetch assigned tasks on mount, populate the picker with real data, track `taskId` (integer) per row, and `POST` to `/api/work-entries` on submit.
- Remove the now-redundant static task `<select>` from the project row card.

## Capabilities

### New Capabilities

- `employee-task-lookup`: Employee-accessible endpoint to retrieve tasks assigned to the current user, grouped by client and project hierarchy.
- `report-form-api-connectivity`: End-to-end wiring of the daily report form — task data fetched on mount, form submission persisted via `POST /api/work-entries`.

### Modified Capabilities

- `db-migrations`: No schema changes required — `task_id` and `location` are already nullable in `work_entries`; `user_tasks` join already exists.

## Impact

- **Backend**: `backend/src/middleware/auth.js` (dual token source), `backend/src/routes/tasks.js` (new `/mine` route, admin guard moved per-route)
- **Frontend**: `frontend/src/features/daily-reporting/ProjectPicker.tsx` (3-level hierarchy), `frontend/src/features/daily-reporting/ReportForm.tsx` (data fetching + API submit), `frontend/src/api/client.js` (no change needed once auth middleware is fixed)
- **No new dependencies**, no database migrations, no breaking API changes for admin routes
