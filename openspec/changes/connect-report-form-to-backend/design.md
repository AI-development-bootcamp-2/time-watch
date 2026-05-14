## Context

The ReportForm lives in `frontend/src/features/daily-reporting/ReportForm.tsx` and manages a daily work entry (date, per-row project/task/time/location). On submit it calls `onSave(payload)` — a local prop callback — with no HTTP call. The `apiFetch` helper in `frontend/src/api/client.js` reads a JWT from `localStorage['time_watch_token']` and attaches it as `Authorization: Bearer <token>`. The backend `authenticate` middleware in `backend/src/middleware/auth.js` only reads from `req.cookies.token` (an HttpOnly cookie set at login), so every `apiFetch` call currently arrives unauthenticated and is rejected with 401.

The `POST /api/work-entries` endpoint already exists and accepts `{ date, entries[] }`. The `GET /api/tasks` endpoint exists but is behind `requireRole('admin')`. Employees have no way to fetch their assigned tasks (the `user_tasks` join table already stores these assignments).

## Goals / Non-Goals

**Goals:**
- Make every `apiFetch` call reach the backend as authenticated, without changing the existing login/cookie flow.
- Give employees a single endpoint to retrieve their assigned tasks with full client → project context.
- Wire ReportForm: fetch tasks on mount, select by drilling down through client → project → task, submit entries to the DB.
- Make `ProjectPicker` support 3-level selection (client → project → task) while preserving the existing search UX.

**Non-Goals:**
- Admin CRUD for tasks, projects, or clients — those routes stay admin-only and are unchanged.
- Timer mode integration — handled separately.
- Editing or deleting existing work entries — out of scope.
- Monthly calendar view refresh after save — parent component owns that; `onSave` callback will still fire post-submit.

## Decisions

### D1: Fix auth by updating the middleware to accept both cookie and Authorization header

**Decision:** Update `authenticate()` in `auth.js` to check `req.cookies.token` first, then fall back to the `Authorization: Bearer` header.

**Why:** The frontend already works this way (localStorage + header). Changing the frontend to use `credentials: 'include'` would require updating CORS config, server-side `SameSite` settings, and every existing test mock. Dual-source token extraction is a one-function change with zero client impact and keeps the existing cookie-based flow intact for any future browser clients.

**Alternatives considered:**
- Switch frontend to `credentials: 'include'` — requires backend CORS `allowedOrigins` + `credentials: true` config, risky in staging/prod with wildcard origins.
- Store JWT in both cookie and localStorage at login — redundant and increases attack surface.

### D2: New `/api/tasks/mine` route, admin guard moved per-route in tasks.js

**Decision:** Add `GET /tasks/mine` before any other route in `tasks.js`. Remove `router.use(requireRole('admin'))` (file-level guard) and add `requireRole('admin')` inline to each existing handler (`GET /`, `POST /`, `PUT /:id`).

**Why:** The `/mine` route must be reachable by employees. The current file-level `router.use(requireRole('admin'))` gates everything. Per-route guards are the standard Express pattern and make access control explicit at the definition site.

**Alternatives considered:**
- Separate router file `userTasks.js` — works but adds a file and a route mount just for one endpoint.

### D3: ProjectPicker becomes a 3-level drill-down (client → project → task)

**Decision:** Replace the `ProjectGroup = { client, projects: string[] }` type with `ClientGroup = { client, clientId, projects: [{ id, name, tasks: [{ id, name }] }] }`. Internal `view` state drives which level is shown. Search flattens all matching tasks across the hierarchy.

**Why:** The DB hierarchy is Client → Project → Task, and the form needs to capture `task_id` (integer). The 2-level picker only captured a project name string, losing the required ID and forcing a separate task `<select>` that was always empty (no data source). Consolidating into one 3-level picker eliminates the dead select and gives a clean UX.

**Alternatives considered:**
- Keep 2-level picker for project, add separate task picker modal — two modals is worse UX than one drill-down.
- Flat searchable list of all tasks — loses visual grouping by client/project, harder to navigate with many assignments.

### D4: ReportForm owns the POST; `onSave` prop is preserved as a post-success hook

**Decision:** `handleSave` calls `apiFetch('/api/work-entries', { method: 'POST', body })` directly. After a successful save, it still calls the `onSave` prop (if provided) so parent components (e.g., monthly calendar) can react. The `WorkPayload` type and prop signature are unchanged.

**Why:** Keeps the component self-contained. Parent components that pass `onSave` don't need to change — they just get called after persistence instead of before.

## Risks / Trade-offs

- **Dual auth token source increases attack surface slightly** → Mitigation: header token is validated identically to cookie token (same `verifyToken` call); no new trust level is granted.
- **`req.user.id` fallback `?? 1` in workEntries.js becomes dead code** → Not a bug, but should be cleaned up in this change to avoid confusion.
- **ProjectPicker drill-down state resets on every open** → Acceptable: the picker is conditionally rendered (`pickerForProjectId !== null`), so each open starts fresh at the client list. Users who want to reselect will need to drill down again.
- **Employee with zero task assignments sees empty picker** → Mitigation: show a "לא הוקצו לך משימות — פנה למנהל" message in the picker when `groups` is empty.

## Migration Plan

1. Deploy backend changes first (auth middleware + new route) — backward compatible with existing cookie-based sessions.
2. Deploy frontend changes — immediately benefits from the fixed auth middleware.
3. No DB migrations required.
4. Rollback: reverting `auth.js` to cookie-only breaks the frontend header flow but restores the prior state cleanly.

## Open Questions

- Should `GET /api/tasks/mine` also filter by `tasks.status = 'open'`? Closed tasks are likely not relevant for new reports. (Recommendation: yes, add `where tasks.status = 'open'`.)
- Should the form show a success toast/snackbar after save, or just close? (Recommendation: close the form and let the parent refresh the calendar.)
