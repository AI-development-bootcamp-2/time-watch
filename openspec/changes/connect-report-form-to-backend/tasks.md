## 1. Fix Auth Middleware (backend/src/middleware/auth.js)

- [x] 1.1 Add `extractToken(req)` helper that returns `req.cookies?.token` if present, else parses `Authorization: Bearer <token>` header, else returns `null`
- [x] 1.2 Replace the existing `const token = req.cookies?.token` line in `authenticate()` with a call to `extractToken(req)`
- [x] 1.3 Add unit tests: Bearer header accepted when no cookie; cookie takes priority when both present

## 2. Add Employee Task Endpoint (backend/src/routes/tasks.js)

- [x] 2.1 Remove `router.use(requireRole('admin'))` from the top of the file
- [x] 2.2 Add `requireRole('admin')` as inline middleware to `GET /`, `POST /`, and `PUT /:id` handlers
- [x] 2.3 Add `GET /mine` route (before any `/:id` routes) that joins `user_tasks → tasks → projects → clients`, filters `user_tasks.deleted_at IS NULL`, `tasks.deleted_at IS NULL`, `tasks.status = 'open'`, and returns flat rows: `task_id, task_name, project_id, project_name, client_id, client_name`
- [x] 2.4 Add unit tests for `/mine`: authenticated employee gets their tasks; unauthenticated gets 401; employee cannot access `GET /` (403)

## 3. Update ProjectPicker to 3-Level Hierarchy (frontend/src/features/daily-reporting/ProjectPicker.tsx)

- [x] 3.1 Define new types: `TaskOption { id, name }`, `ProjectNode { id, name, tasks }`, `ClientGroup { client, clientId, projects }` and update component props accordingly (`selected` becomes `number | null`, `onSelect` becomes `(taskId, taskName, projectName) => void`, `groups` becomes `ClientGroup[]`)
- [x] 3.2 Add internal `view` state with 3 levels: `{ level: 'clients' }`, `{ level: 'projects', clientGroup }`, `{ level: 'tasks', clientGroup, projectNode }`
- [x] 3.3 Render client list at `level: 'clients'` — each item navigates to projects level
- [x] 3.4 Render project list at `level: 'projects'` — each item navigates to tasks level; back button returns to clients
- [x] 3.5 Render task list at `level: 'tasks'` — each item calls `onSelect(task.id, task.name, projectNode.name)`; back button returns to projects
- [x] 3.6 Implement search: when query is non-empty, show flat list of matching tasks (match against task name, project name, client name) bypassing drill-down
- [x] 3.7 Show "לא הוקצו לך משימות — פנה למנהל" when `groups` is empty and no search query
- [x] 3.8 Update header title to reflect current level (e.g., client name at project level, project name at task level)

## 4. Update ReportForm (frontend/src/features/daily-reporting/ReportForm.tsx)

- [x] 4.1 Add `taskId: number | null` to the `ProjectRow` type and set `taskId: null` in the `newProject()` factory
- [x] 4.2 Import `apiFetch` from `../../api/client` and `useEffect` from react
- [x] 4.3 Add `taskGroups`, `tasksLoading`, `tasksError` state; add `useEffect` that calls `GET /api/tasks/mine` on mount and builds a `ClientGroup[]` from the flat response rows (grouped by `client_id`, then `project_id`)
- [x] 4.4 Update the ProjectPicker call site: pass `groups={taskGroups}`, change `selected` to `current?.taskId ?? null`, and update `onSelect` to set `task`, `taskId`, and `project` on the row
- [x] 4.5 Remove the static `TASKS` constant and the "משימה" `<select>` row from each project card (task selection is now done through the 3-level picker)
- [x] 4.6 Update validation in `validateWork()`: require `p.taskId !== null` (not just `p.task`) to consider a row's task valid
- [x] 4.7 Replace `onSave(payload)` in `handleSave` with a `POST /api/work-entries` call; format date as `YYYY-MM-DD` using local `getFullYear/getMonth/getDate`; map rows to `{ start_time, end_time, location, task_id, description }`; on success call `onSave` prop (if provided) then `onClose`
- [x] 4.8 Add `saveError` state and display error message in the form when the POST fails
- [x] 4.9 Show loading indicator (disable save button) while `tasksLoading` or `saving` is true
- [x] 4.10 Clean up: remove the `?? 1` fallback from `userId` in `workEntries.js` (it's now dead code since `req.user` is always populated for authenticated requests)

## 5. Verification

- [x] 5.1 Start Docker services (`docker compose up`) and log in as an employee user
- [ ] 5.2 Open the daily report form — confirm the project picker shows real client/project/task groups fetched from the DB
- [ ] 5.3 Select a task, fill in times and location, submit — confirm the entry appears in the DB (`work_entries` table)
- [ ] 5.4 Try submitting without selecting a task — confirm validation error is shown
- [ ] 5.5 Run backend tests (`npm test` in `backend/`) — confirm all existing tests pass plus new auth and tasks/mine tests
