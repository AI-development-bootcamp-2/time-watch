# Epic 4 — Admin Interface: Jira-Ready Breakdown

---

## Story 4.1 — User Management

---

### Backend Ticket

**Title:** `[BE] Admin User Management API`

**Description:**
Implement the REST endpoints that allow admins to list, create, edit, and soft-deactivate user accounts. Includes password hashing, complexity enforcement, a last-active-admin guard (using a DB transaction with `SELECT … FOR UPDATE`), and rejection of deactivated users at login.

**Subtasks:**
- [ ] Add `GET /api/users` — return all users; require `admin` role
- [ ] Add `POST /api/users` — validate fields, enforce password complexity, hash with bcrypt
- [ ] Add `PUT /api/users/:id` — update name/email/role/status; re-hash password if provided
- [ ] Add `PATCH /api/users/:id/deactivate` — transactional last-admin guard; return 400 if violated
- [ ] Extend login to reject deactivated users with 403
- [ ] Write unit tests: list, create (valid/invalid password), edit, deactivate (normal + last-admin guard), login with deactivated account

**Acceptance Criteria:**
- `GET /api/users` returns 403 for non-admins and the full user list for admins
- `POST /api/users` returns 409 on duplicate email and 422 on weak password
- `PATCH /api/users/:id/deactivate` returns 400 when the target is the last active admin
- Deactivated users receive 403 on login attempts
- All routes are covered by unit tests

**Definition of Done:**
- All four endpoints return correct status codes and enforce the admin role guard
- Last-admin guard is tested including a concurrent-access scenario
- Deactivated users cannot log in
- All backend unit tests pass; code coverage ≥ 60% for new code

**Dependencies:** Epic 2 (JWT auth middleware + `requireRole`) must be complete

---

### Frontend Ticket

**Title:** `[FE] Admin Users Management Screen`

**Description:**
Build the desktop-only, RTL Hebrew admin page for managing users. Includes a filterable table, an add/edit modal with full client-side validation, and a deactivate button with inline error handling.

**Subtasks:**
- [ ] Create `UsersPage.jsx` — desktop layout, table with columns: name, email, role, status badge
- [ ] Add status filter toggle (active / inactive / all)
- [ ] Create `UserModal.jsx` — fields: full name, email, role dropdown, active toggle, password
- [ ] Implement client-side validation: required fields, email format, password complexity with Hebrew error messages
- [ ] Wire "Add User" button (empty modal) and row click (pre-filled modal)
- [ ] Connect modal save to `POST /api/users` (create) or `PUT /api/users/:id` (edit); show inline API errors
- [ ] Add "Deactivate" button in edit modal calling `PATCH /api/users/:id/deactivate`; show 400 error inline
- [ ] Add `UsersPage` to admin sidebar (admin only)

**Acceptance Criteria:**
- Table shows all users; filter correctly hides/shows rows by status
- Add modal opens empty; edit modal opens pre-filled with current data
- Client-side validation shows per-field Hebrew messages before any API call
- API error messages (duplicate email, last-admin guard) appear inline in the modal
- Page is unreachable and hidden in the sidebar for non-admin roles

**Definition of Done:**
- `UsersPage` displays all users with status filter working
- Modal validates all fields in Hebrew before submitting
- Inline error messages appear for all API-level rejections
- Page is admin-only (sidebar + route guard)

**Dependencies:** `[BE] Admin User Management API` ticket

---

## Story 4.2 — Entity Management

---

### Backend Ticket

**Title:** `[BE] Admin Entity Management API (Clients, Projects, Tasks)`

**Description:**
Implement CRUD endpoints for the Client → Project → Task hierarchy. All entities use soft-delete (`is_active`). The client deactivation response includes active-children counts. Employee-facing list endpoints must continue returning only active entities.

**Subtasks:**
- [ ] Add `GET /api/clients`, `POST /api/clients`, `PUT /api/clients/:id` — name required, contact optional, soft-delete; admin only
- [ ] Add `GET /api/projects`, `POST /api/projects`, `PUT /api/projects/:id` — name + active `client_id` required, soft-delete; admin only
- [ ] Add `GET /api/tasks`, `POST /api/tasks`, `PUT /api/tasks/:id` — name + `project_id` required, soft-delete; admin only
- [ ] Support `?is_active` query param on all list endpoints; verify employee-facing endpoints still return active-only
- [ ] Include active-children counts in client deactivation response body
- [ ] Write unit tests: CRUD, soft-delete, role guard, inactive entities absent from employee dropdowns

**Acceptance Criteria:**
- All write endpoints return 403 for non-admins
- Soft-delete sets `is_active = false`; deactivated entities are excluded from employee-facing dropdowns
- Client deactivation response includes counts of active projects and tasks
- Inactive clients do not appear in the project-creation dropdown

**Definition of Done:**
- CRUD endpoints enforce admin role and return correct status codes
- Soft-delete verified for all three entity types
- Employee-facing endpoints unaffected by admin filter param
- All backend unit tests pass; code coverage ≥ 60% for new code

**Dependencies:** Epic 1 DB schema (clients, projects, tasks tables); `requireRole` middleware from Epic 2

---

### Frontend Ticket

**Title:** `[FE] Admin Entity Management Screens (Clients, Projects, Tasks)`

**Description:**
Build three admin management screens — Clients, Projects, and Tasks — each with a filterable table and an add/edit modal. Client deactivation shows a warning when active children exist.

**Subtasks:**
- [ ] Create `ClientsPage.jsx` — table: name, contact, status; "Add Client" button; row click → edit modal; active/inactive filter
- [ ] Create `ClientModal.jsx` — fields: name (required), contact (optional), active toggle; warning if client has active children
- [ ] Create `ProjectsPage.jsx` — table grouped by client: client, project name, status; "Add Project" button; row click → edit modal
- [ ] Create `ProjectModal.jsx` — fields: active-clients-only dropdown, project name (required), active toggle
- [ ] Create `TasksPage.jsx` — task list per project: task name, status (open/closed); "Add Task" button; row click → edit modal
- [ ] Create `TaskModal.jsx` — fields: task name (required), project reference, active toggle
- [ ] Add Clients, Projects, Tasks to admin sidebar (admin only)
- [ ] Implement deactivation warning modal for clients with active children (show child-entity count)

**Acceptance Criteria:**
- All three pages are accessible only to admins (sidebar + route guard)
- Inactive clients do not appear in the project-creation client dropdown
- Deactivating a client with active children shows a warning modal with child counts before proceeding
- Add modals open empty; edit modals open pre-filled; validation blocks submission on missing required fields

**Definition of Done:**
- All three management pages render in the admin sidebar, admin-only
- Soft-delete reflected immediately in UI after save
- Child-entity warning shown before client deactivation proceeds
- Inactive entities absent from employee-facing dropdowns (verified manually or via test)

**Dependencies:** `[BE] Admin Entity Management API` ticket

---

## Story 4.3 — Assignments & Project Manager Role

---

### Backend Ticket

**Title:** `[BE] User-Task Assignments API + Project Manager Role`

**Description:**
Add assignment endpoints (`POST`/`DELETE`/`GET /api/user-tasks`) accessible to both admin and project-manager roles. Extend `requireRole` to accept arrays. Verify and test that project managers receive 403 on every other admin endpoint.

**Subtasks:**
- [ ] Extend `requireRole` middleware to accept an array of allowed roles
- [ ] Add `POST /api/user-tasks` — insert assignment; return 409 on duplicate; require admin or project-manager
- [ ] Add `DELETE /api/user-tasks` — remove assignment; return 404 if not found; require admin or project-manager
- [ ] Add `GET /api/user-tasks` — accept `userId` or `taskId` query param with joined details; require admin or project-manager
- [ ] Add integration tests asserting 403 for project-manager on every non-assignment admin route
- [ ] Write unit tests: assign, remove, duplicate, role permissions

**Acceptance Criteria:**
- Assignment endpoints accept admin and project-manager JWTs
- Every other admin endpoint returns 403 for a project-manager JWT (every route covered by a test)
- Duplicate assignment returns 409; missing assignment on delete returns 404

**Definition of Done:**
- `requireRole` supports multi-role arrays
- All admin routes tested for project-manager 403 enforcement
- All backend unit tests pass; code coverage ≥ 60% for new code

**Dependencies:** `requireRole` middleware from Epic 2; users and tasks tables from Epic 1

---

### Frontend Ticket

**Title:** `[FE] Assignment Management Screen + Project Manager Nav Guard`

**Description:**
Build the `AssignmentsPage` with "by user" and "by task" views. Implement delta-based save (only changed assignments trigger API calls). Apply role-based nav guards so project managers see only the Assignments page.

**Subtasks:**
- [ ] Create `AssignmentsPage.jsx` — layout with tab/toggle for "by user" and "by task" views
- [ ] Implement "by user" view: user dropdown, task checklist grouped by client/project, pre-checked current assignments
- [ ] Implement "by task" view: task dropdown, employee checklist, pre-checked current assignments
- [ ] Wire Save: compute delta, call `POST /api/user-tasks` for additions and `DELETE /api/user-tasks` for removals
- [ ] Apply nav guard: project-manager sees Assignments page only; direct URL access to other admin pages redirects to home
- [ ] Add `AssignmentsPage` to admin sidebar, visible to admin and project-manager roles

**Acceptance Criteria:**
- Both views load pre-checked state from the API on selection
- Save sends only changed assignments (no redundant API calls)
- Project-manager role sees only the Assignments sidebar entry; all other admin routes redirect to home
- Admin role continues to see all admin pages

**Definition of Done:**
- Both views load, display, and persist assignments correctly
- Delta computation verified (only changes trigger API calls)
- Project-manager nav and route guards enforced end-to-end

**Dependencies:** `[BE] Assignments API` ticket; role stored in JWT (Epic 2)

---

## Story 4.4 — Employee Report Oversight

---

### Backend Ticket

**Title:** `[BE] Admin Report Oversight + Audit Log`

**Description:**
Extend `GET /api/work-entries` to allow admins to query any employee's entries. Implement an atomic audit log write inside `WorkEntryService.updateEntry` — the audit insert and the entry update commit or roll back together.

**Subtasks:**
- [ ] Extend `GET /api/work-entries` to accept `userId` query param; non-admins receive 403 if `userId` ≠ their own
- [ ] Stub `checkMonthLock` middleware integration point on `PUT /api/work-entries/:id` (will be completed in Story 4.5)
- [ ] Implement audit log write in `WorkEntryService.updateEntry` — transactional with entry update; includes: admin_user_id, entry_id, employee_user_id, changed_fields JSON, timestamp
- [ ] Ensure employees cannot trigger audit log writes via the route guard
- [ ] Write unit tests: admin fetches any entry, employee blocked on others' entries, audit log created on admin edit, audit insert failure rolls back entry update

**Acceptance Criteria:**
- `GET /api/work-entries?userId=:id` returns 403 for non-admin callers with a different userId
- `PUT /api/work-entries/:id` writes an audit log row atomically; if audit insert fails, the entry is not updated
- No audit log row is created on employee self-edits

**Definition of Done:**
- Admin can fetch any employee's work entries; non-admins blocked
- Audit log written atomically; rollback on audit failure verified
- All backend unit tests pass; code coverage ≥ 60% for new code

**Dependencies:** `audit_log` table from Epic 1 DB schema; `requireRole` from Epic 2

---

### Frontend Ticket

**Title:** `[FE] Admin Report Oversight Screen`

**Description:**
Build `AdminReportsPage` with employee and month selectors. Reuse the existing monthly work-entry list component. Pass a read-only flag for locked months. Open entries in the shared edit form for unlocked months.

**Subtasks:**
- [ ] Create `AdminReportsPage.jsx` — employee dropdown (all active users) + month selector (YYYY-MM); load entries on selection
- [ ] Reuse monthly work-entry list component; pass `readOnly` prop when month is locked
- [ ] On entry click in unlocked month, open `ReportForm` in edit mode pre-filled; save calls `PUT /api/work-entries/:id`
- [ ] Display "Locked — read only" banner on month header when locked; disable all edit controls
- [ ] Show per-entry details: date, time range, location, client, project, task, description; per-day total + status indicator
- [ ] Add `AdminReportsPage` to admin sidebar (admin only)

**Acceptance Criteria:**
- Selecting an employee + month loads and displays their work entries with day-status indicators
- Clicking an entry in an unlocked month opens the shared edit form; save updates the entry
- Locked-month entries display read-only — no edit UI is rendered and no API call can be triggered
- Page is hidden in sidebar and route-guarded for non-admins

**Definition of Done:**
- Page loads any employee's monthly entries correctly
- Locked month read-only mode enforced in the UI (no controls rendered)
- Edit form opens and saves successfully for unlocked months

**Dependencies:** `[BE] Admin Report Oversight + Audit Log` ticket; shared `ReportForm` component from Epic 3; month-lock status from Story 4.5 (can be stubbed as always-unlocked until 4.5 is done)

---

## Story 4.5 — Month Locking

---

### Backend Ticket

**Title:** `[BE] Month Locking API + Auto-Lock Cron`

**Description:**
Add `checkMonthLock` middleware applied to all work-entry and absence-entry write routes. Implement manual lock/unlock endpoints. Add a `node-cron` job that auto-locks the previous month at 00:00 on the 1st. Add a DB migration for `lock_source` and nullable `locked_by` columns.

**Subtasks:**
- [ ] Add `checkMonthLock` middleware — returns 423 if matching `month_locks` row exists; apply to all `POST`/`PUT`/`PATCH` for `work_entries` and `absence_entries`
- [ ] Add `GET /api/month-locks` — return all lock records with year, month, lock_source, locked_by name, locked_at; admin only
- [ ] Add `POST /api/month-locks` — validate year/month; check for active `timer_state` rows (409 if any); insert lock record (manual); admin only
- [ ] Add `DELETE /api/month-locks/:id` — delete lock record; 404 if not found; admin only
- [ ] Add `node-cron` job at 00:00 on the 1st: skip if active timers present (log warning); insert auto-lock record (`locked_by = NULL`, `lock_source = 'auto'`)
- [ ] Add DB migration: `lock_source` column on `month_locks`; `locked_by` nullable FK to `users`
- [ ] Write unit tests: manual lock success, blocked by timer, already locked, unlock, middleware 423, cron integration

**Acceptance Criteria:**
- All `work_entries` and `absence_entries` write endpoints return 423 for locked months
- `POST /api/month-locks` returns 409 when an active timer exists or month is already locked
- Auto-lock cron inserts a record for the previous month on the 1st; skips if timers are active
- `DELETE /api/month-locks/:id` returns 404 for a non-existent lock

**Definition of Done:**
- `checkMonthLock` middleware blocks writes across all affected routes (verified per-route)
- Manual lock blocks on active timers and duplicate locks
- Auto-lock cron registers on startup and has an integration test
- All backend unit tests pass; code coverage ≥ 60% for new code

**Dependencies:** `month_locks` table from Epic 1; `timer_state` table from Epic 3 (Story 3.2)

---

### Frontend Ticket

**Title:** `[FE] Month Locking Management Screen`

**Description:**
Build `MonthLockingPage` showing the last 24 months with lock status badges, locker info, and Lock/Unlock buttons. Add a Hebrew confirmation dialog before locking. Show warnings for active timers or missing days. Integrate the locked-month banner into the employee monthly view.

**Subtasks:**
- [ ] Create `MonthLockingPage.jsx` — list of last 24 months: month name (Hebrew), lock badge, locker name + timestamp, lock source (auto/manual)
- [ ] Add Lock button for unlocked months — Hebrew confirmation dialog before calling `POST /api/month-locks`
- [ ] Add Unlock button for locked months — calls `DELETE /api/month-locks/:id` directly (no confirmation)
- [ ] Show warning indicator if active timers or missing days exist; confirmation dialog lists affected employees
- [ ] Handle 409 inline: display error message in the month row (e.g. "לא ניתן לנעול — 2 טיימרים פעילים")
- [ ] Add `MonthLockingPage` to admin sidebar (admin only)
- [ ] Integrate lock status into employee monthly view: fetch lock for displayed month; show "Month Locked" banner; disable add/edit buttons

**Acceptance Criteria:**
- Month list shows correct lock status, locker name, timestamp, and lock source for each month
- Lock button shows a Hebrew confirmation dialog before proceeding
- 409 errors (active timers, already locked) appear inline in the relevant month row — no modal
- Employee monthly view shows a "Month Locked" banner and all write controls are disabled when the month is locked

**Definition of Done:**
- Month list renders with correct badges and locker info
- Hebrew confirmation dialog appears before every manual lock action
- 409 errors display inline without breaking the page
- Employee monthly view lock banner and control disabling work end-to-end

**Dependencies:** `[BE] Month Locking API + Auto-Lock Cron` ticket; employee monthly view component from Epic 3 (Story 3.4)
