## 1. Story 4.1 — User Management (Backend)

- [ ] 1.1 Add `GET /api/users` route — return all users (id, name, email, role, is_active); require `admin` role via `requireRole` middleware
- [ ] 1.2 Add `POST /api/users` route — validate required fields, enforce password complexity (≥8 chars, upper, lower, digit, special char), hash with bcrypt, insert into `users` table; require `admin` role
- [ ] 1.3 Add `PUT /api/users/:id` route — allow updating name, email, role, is_active; if password field is present, re-hash with bcrypt; require `admin` role
- [ ] 1.4 Add `PATCH /api/users/:id/deactivate` route — wrap in a DB transaction, `SELECT COUNT(*) … FOR UPDATE` to check last-active-admin constraint, return 400 if violated, otherwise set `is_active = false`
- [ ] 1.5 Extend login check to reject deactivated users (return 403 with a clear message)
- [ ] 1.6 Write unit tests: list users, create user (valid/invalid password), edit user, deactivate user (normal + last-admin guard), login with deactivated account

## 2. Story 4.1 — User Management (Frontend)

- [ ] 2.1 Create `UsersPage.jsx` under `frontend/src/features/admin/` — desktop-only layout (RTL Hebrew), table component showing all users with columns: full name, email, role, status badge
- [ ] 2.2 Add status filter toggle (active / inactive / all) that client-side filters the user table rows
- [ ] 2.3 Create `UserModal.jsx` — add/edit modal with fields: full name (required), email (required), role dropdown (employee / project-manager / admin), active toggle, password field (empty = no change on edit, required on create)
- [ ] 2.4 Implement client-side validation in `UserModal.jsx`: required fields, email format, password complexity rules with per-rule feedback messages in Hebrew
- [ ] 2.5 Wire "Add User" button to open an empty `UserModal`; wire row click to open a pre-filled `UserModal`
- [ ] 2.6 Connect modal save to `POST /api/users` (create) or `PUT /api/users/:id` (edit); show inline API error messages (e.g., duplicate email, last-admin guard)
- [ ] 2.7 Add a "Deactivate" button inside the edit modal that calls `PATCH /api/users/:id/deactivate` and displays the 400 error inline if the last-admin guard triggers
- [ ] 2.8 Add `UsersPage` to the admin navigation sidebar with role guard (admin only)

### Definition of Done — Story 4.1

- All four user API endpoints (list, create, edit, deactivate) return correct status codes and enforce the `admin` role guard
- Last-active-admin guard blocks deactivation inside a DB transaction; tested with a concurrent-access scenario
- Deactivated users cannot log in
- `UsersPage` displays all users with status filter; add/edit modal validates all fields in Hebrew before submitting
- Inline error messages appear for API-level rejections (duplicate email, last-admin guard)
- All backend unit tests pass; code coverage ≥ 60% for new code

## 3. Story 4.2 — Entity Management (Backend)

- [ ] 3.1 Add `GET /api/clients`, `POST /api/clients`, `PUT /api/clients/:id` routes — name required, contact optional, soft-delete via `is_active`; require `admin` role
- [ ] 3.2 Add `GET /api/projects`, `POST /api/projects`, `PUT /api/projects/:id` routes — name and `client_id` required (active clients only), soft-delete via `is_active`; require `admin` role
- [ ] 3.3 Add `GET /api/tasks`, `POST /api/tasks`, `PUT /api/tasks/:id` routes — name and `project_id` required, soft-delete via `is_active`; require `admin` role
- [ ] 3.4 Ensure all entity list endpoints filter by `is_active` query param (default: return all); employee-facing endpoints already filter to active-only — verify this is unchanged
- [ ] 3.5 Add child-count response field to client deactivation: when a client is set to `is_active = false`, the response includes counts of active projects and tasks under it (for frontend warning display)
- [ ] 3.6 Write unit tests: CRUD for clients, projects, and tasks; soft-delete; role guard (admin vs non-admin); inactive client not returned on employee dropdowns

## 4. Story 4.2 — Entity Management (Frontend)

- [ ] 4.1 Create `ClientsPage.jsx` — table of clients with columns: name, contact, status; "Add Client" button; row click opens edit modal; active/inactive filter
- [ ] 4.2 Create `ClientModal.jsx` — fields: name (required), contact (optional), active toggle; validate required fields; deactivation shows warning if client has active children
- [ ] 4.3 Create `ProjectsPage.jsx` — table of projects grouped by client with columns: client, project name, status; "Add Project" button; row click opens edit modal
- [ ] 4.4 Create `ProjectModal.jsx` — fields: client dropdown (active clients only), project name (required), active toggle; validate required fields
- [ ] 4.5 Create `TasksPage.jsx` (or embed in project detail view) — list of tasks per project with columns: task name, status (open/closed); "Add Task" button; row click opens edit modal
- [ ] 4.6 Create `TaskModal.jsx` — fields: task name (required), project reference (display only in edit, selectable in create), active toggle
- [ ] 4.7 Add Clients, Projects, and Tasks entries to the admin navigation sidebar (admin only)
- [ ] 4.8 Implement deactivation confirmation for clients with active children: show warning modal with child-entity count before proceeding

### Definition of Done — Story 4.2

- CRUD endpoints for clients, projects, and tasks all enforce the `admin` role and return 403 for other roles
- Soft-delete sets `is_active = false`; deactivated entities no longer appear in employee-facing dropdowns
- Client deactivation response includes active-children counts; frontend displays the warning before proceeding
- Inactive clients are excluded from the project-creation client dropdown
- All three management pages (Clients, Projects, Tasks) render in the admin sidebar and are reachable only by admins
- All backend unit tests pass; code coverage ≥ 60% for new code

## 5. Story 4.3 — Assignments & Project Manager Role (Backend)

- [ ] 5.1 Extend `requireRole` middleware to support an array of allowed roles (e.g., `requireRole('admin', 'project-manager')`)
- [ ] 5.2 Add `POST /api/user-tasks` route — body: `{ user_id, task_id }`; insert into `user_tasks`; return 409 on duplicate; require `admin` or `project-manager` role
- [ ] 5.3 Add `DELETE /api/user-tasks` route — body: `{ user_id, task_id }`; remove matching row; return 404 if not found; require `admin` or `project-manager` role
- [ ] 5.4 Add `GET /api/user-tasks` route — accept `userId` or `taskId` query param; return assignments with joined user and task details; require `admin` or `project-manager` role
- [ ] 5.5 Verify all other admin routes (users, clients, projects, tasks, months) return 403 for project-manager callers — add integration tests covering every such route
- [ ] 5.6 Write unit tests: assign user to task, remove assignment, duplicate assignment, project-manager allowed on assignment routes, project-manager blocked on all other admin routes

## 6. Story 4.3 — Assignments & Project Manager Role (Frontend)

- [ ] 6.1 Create `AssignmentsPage.jsx` — layout with a tab/toggle for two views: "by user" and "by task"
- [ ] 6.2 Implement "by user" view: user dropdown (all active employees), task checklist grouped by client/project with pre-checked assigned tasks; save diffs to the API on click of "Save"
- [ ] 6.3 Implement "by task" view: task dropdown (all active tasks), employee checklist with pre-checked assigned employees; save diffs to the API on click of "Save"
- [ ] 6.4 Wire save action: compute the delta between original assignments and modified state; call `POST /api/user-tasks` for new assignments and `DELETE /api/user-tasks` for removed ones
- [ ] 6.5 Apply role-based route guard to admin nav: project-manager role can only see the Assignments page; all other admin pages are hidden and their routes return to `/` if accessed directly
- [ ] 6.6 Add `AssignmentsPage` to admin navigation, visible to both admin and project-manager roles

### Definition of Done — Story 4.3

- `POST /api/user-tasks` and `DELETE /api/user-tasks` accept admin and project-manager callers; all other admin endpoints return 403 to project-manager callers (verified by integration tests covering every admin route)
- Project-manager JWT navigates to the Assignments page only; direct URL access to any other admin page redirects to home
- Both "by user" and "by task" assignment views load correctly, show pre-checked state, and persist changes via API on Save
- Delta computation is correct — only changed assignments trigger API calls
- All backend unit tests pass; code coverage ≥ 60% for new code

## 7. Story 4.4 — Employee Report Oversight (Backend)

- [ ] 7.1 Extend `GET /api/work-entries` to accept `userId` query param — admin callers may pass any user ID; non-admin callers receive 403 if `userId` differs from their own
- [ ] 7.2 Ensure `PUT /api/work-entries/:id` is already protected by the month-lock check middleware (will be added in Story 4.5) — stub the middleware integration point now
- [ ] 7.3 Implement audit log write inside `WorkEntryService.updateEntry` — open a DB transaction, update the entry, insert a record into `audit_log` (admin_user_id, entry_id, employee_user_id, changed_fields JSON, timestamp), commit atomically; if audit insert fails, roll back both
- [ ] 7.4 Ensure non-admin callers cannot trigger audit log writes (route guard on `userId` check prevents admin-level access)
- [ ] 7.5 Write unit tests: admin can fetch any employee's entries, employee cannot fetch others' entries, audit log record created on admin edit, audit log insert failure rolls back the entry update

## 8. Story 4.4 — Employee Report Oversight (Frontend)

- [ ] 8.1 Create `AdminReportsPage.jsx` — two dropdowns at the top: employee selector (all active users) and month selector (YYYY-MM format); on selection, load and display that employee's work entries
- [ ] 8.2 Reuse the monthly work-entry list component from the employee interface to display entries in `AdminReportsPage`; pass a read-only flag when the month is locked
- [ ] 8.3 When a work entry is clicked in an unlocked month, open the existing `ReportForm` in edit mode pre-filled with the entry's data; on save, call `PUT /api/work-entries/:id`
- [ ] 8.4 Display a "Locked — read only" indicator on the month header when the selected month is locked; disable all edit controls
- [ ] 8.5 Show the date, time range, location, client, project, task, and description for each entry; display total hours per day and a day-status indicator (complete / missing / exceptional)
- [ ] 8.6 Add `AdminReportsPage` to admin navigation sidebar (admin only)

### Definition of Done — Story 4.4

- Admin can fetch any employee's work entries via `GET /api/work-entries?userId=:id`; non-admins receive 403
- Audit log record is written atomically with every successful admin edit; a failed audit insert rolls back the entry update
- `AdminReportsPage` loads a selected employee's month, displays entries with day-status indicators, and opens entries in the shared edit form
- Entries in a locked month display read-only — no edit controls rendered, no API call possible
- All backend unit tests pass; code coverage ≥ 60% for new code

## 9. Story 4.5 — Month Locking (Backend)

- [ ] 9.1 Add `checkMonthLock` middleware — reads the date or month from `req.body`, queries `month_locks`, returns 423 Locked if a matching record exists; apply to all `POST`/`PUT`/`PATCH` routes for `work_entries` and `absence_entries`
- [ ] 9.2 Add `GET /api/month-locks` route — return all lock records with year, month, lock_source, locked_by (user name), and locked_at; require `admin` role
- [ ] 9.3 Add `POST /api/month-locks` route — validate year/month, check for active `timer_state` rows in that month (return 409 if any), insert lock record with `locked_by = req.user.id` and `lock_source = 'manual'`; require `admin` role
- [ ] 9.4 Add `DELETE /api/month-locks/:id` route — delete the lock record; return 404 if not found; require `admin` role
- [ ] 9.5 Add `node-cron` job at `00:00` on the 1st of each month: check for active timers in the previous month (log a warning and skip if any); insert auto-lock record with `locked_by = NULL` and `lock_source = 'auto'`; log incomplete-report warnings
- [ ] 9.6 Add `lock_source` column to `month_locks` table via a new migration if not already present; add `locked_by` as nullable FK to `users`
- [ ] 9.7 Write unit tests: manual lock (success), manual lock blocked by active timer, manual lock on already-locked month, unlock, checkMonthLock middleware blocks writes, auto-lock cron integration test

## 10. Story 4.5 — Month Locking (Frontend)

- [ ] 10.1 Create `MonthLockingPage.jsx` — display a list of the last 24 months, each row showing: month name (Hebrew), lock status badge (Locked / Unlocked), locker name and timestamp (if locked), lock source (auto / manual)
- [ ] 10.2 Add Lock button for unlocked months — on click, show a confirmation dialog (Hebrew text: "האם אתה בטוח שברצונך לנעול את [חודש שנה]?"); on confirm, call `POST /api/month-locks`
- [ ] 10.3 Add Unlock button for locked months — on click, call `DELETE /api/month-locks/:id` directly (no extra confirmation for unlock)
- [ ] 10.4 Show a warning indicator on a month row if the API reports active timers or employees with missing days for that month; clicking the Lock button in this state still shows the confirmation but also lists the affected employees
- [ ] 10.5 Handle 409 error responses from the lock endpoint: display the error message inline in the month row (e.g., "Cannot lock — 2 active timers running")
- [ ] 10.6 Add `MonthLockingPage` to admin navigation sidebar (admin only)
- [ ] 10.7 Integrate lock status into the employee-facing monthly view: fetch lock status for the displayed month and show a "Month Locked" banner; disable all add/edit entry buttons

### Definition of Done — Story 4.5

- `checkMonthLock` middleware blocks all work-entry and absence-entry writes for locked months with 423; verified across all affected routes
- Manual lock endpoint blocks when an active timer exists (409) and when month is already locked (409)
- Auto-lock cron registers on backend startup; fires at 00:00 on the 1st; skips if active timers are present and logs a warning
- `MonthLockingPage` lists months with correct lock status badges, locker info, and lock source (auto/manual); Lock button shows a Hebrew confirmation dialog; 409 errors display inline
- Employee monthly view shows a "Month Locked" banner and disables all write controls for locked months
- All backend unit tests pass; code coverage ≥ 60% for new code
