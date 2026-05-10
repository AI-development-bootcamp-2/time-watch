## Context

Time Watch already has its infrastructure (Docker, DB schema, CI/CD) and authentication layer in place. The next layer is the Admin Interface — a set of desktop-oriented screens and REST endpoints that let admins manage users, entities, assignments, employee reports, and monthly locks. All existing tables (`users`, `clients`, `projects`, `tasks`, `user_tasks`, `work_entries`, `absence_entries`, `month_locks`, `audit_log`) are already defined; this epic wires up the application logic that sits on top of them.

Key constraints carried forward from the general spec:
- Hebrew RTL, desktop layout for admin panel (mobile-first is the employee interface)
- Soft deletes everywhere — no hard deletes on any domain entity
- All admin edits to employee records must be appended to `audit_log`
- Month locking is global (all employees for that month) — enforced at every write endpoint
- Project Manager is a restricted sub-admin role that can only touch user-task assignments

## Goals / Non-Goals

**Goals:**
- Implement all five admin stories (4.1–4.5) as independent, shippable units
- Role-guard middleware enforces Admin vs. Project Manager vs. Employee access on every route
- Every write endpoint checks `month_locks` before mutating `work_entries` or `absence_entries`
- Soft-delete pattern applied uniformly (clients, projects, tasks, users all use `is_active`)
- Last-active-admin guard prevents locking out the system
- Audit log written on every admin edit of an employee's work entry
- Auto-lock cron job runs at 00:00 on the 1st via `node-cron`

**Non-Goals:**
- Email notifications when a month is locked or when an admin edits a report
- Per-employee month lock granularity (lock is global for the month)
- Bulk import or CSV export of users or entities
- Admin dashboard / analytics / aggregate reporting beyond the monthly oversight view
- Mobile layout for admin pages

## Decisions

### D1: Admin panel is a separate React feature module, not a separate app

**Decision:** All admin pages live under `frontend/src/features/admin/`. They share the same React Router instance, auth context, and API service layer as the employee interface.

**Rationale:** Single build, single deployment. The admin-only routes are protected by the role guard in `AuthContext`. Splitting into a separate app would add deployment complexity for no benefit at this project scale.

**Alternatives considered:** Separate Vite build for admin — rejected (doubles CI complexity and Docker config).

---

### D2: Role-guard middleware chain: `authenticate` → `requireRole`

**Decision:** Every admin route applies `authenticate` (validates JWT, attaches `req.user`) followed by `requireRole('admin')` or `requireRole('admin', 'project-manager')` for assignment endpoints. Project Manager receives 403 for all other admin routes.

**Rationale:** Consistent, auditable access control at the route layer. Controllers stay thin and don't re-check roles. This matches the pattern already established in Epic 2.

**Alternatives considered:** Role check inside each controller — rejected (duplicates logic, easy to miss a check).

---

### D3: Month lock check as a middleware, not inline in each controller

**Decision:** A `checkMonthLock(dateField)` middleware is added to all `POST`/`PUT`/`PATCH` routes for `work_entries` and `absence_entries`. It reads the date from the request body, queries `month_locks`, and returns 423 Locked if a matching record exists.

**Rationale:** Centralises enforcement. Adding a new write endpoint automatically picks up lock checking by applying the middleware. No risk of forgetting to add the check in a controller.

**Alternatives considered:** Inline check in each controller — rejected (brittle, easy to omit on future endpoints).

---

### D4: Last-active-admin guard uses a DB transaction with a count check

**Decision:** `PATCH /api/users/:id/deactivate` wraps the operation in a transaction: `SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true FOR UPDATE`. If count ≤ 1 and target is an admin, return 400. Otherwise commit the deactivation.

**Rationale:** Prevents race conditions where two admins deactivate each other simultaneously. `FOR UPDATE` row-level lock ensures the count is stable during the transaction.

**Alternatives considered:** Application-level count check without a transaction — rejected (race condition risk).

---

### D5: Assignment UI offers two views — user-centric and task-centric

**Decision:** The assignment screen has a tab/toggle: "by user" (pick a user, see their tasks checklist) and "by task" (pick a task, see the users checklist). Both write to the same `POST /api/user-tasks` and `DELETE /api/user-tasks` endpoints.

**Rationale:** Admins and project managers need both perspectives. The data model is a simple join table so both views are symmetric — no duplication.

**Alternatives considered:** Single view (user-centric only) — rejected (task-centric view is essential for project managers who manage one project at a time).

---

### D6: Auto-lock cron actor stored as a system sentinel

**Decision:** When the auto-lock cron fires, it inserts a `month_locks` row with `locked_by = NULL` (or a reserved system user ID) and sets a `lock_source = 'auto'` column. The UI distinguishes auto-locked vs. manually-locked months.

**Rationale:** Audit trail clarity. Admins can tell whether a lock was system-generated or manual, which matters when they decide whether to unlock for corrections.

**Alternatives considered:** Store `locked_by = 0` with a sentinel comment — rejected (NULL with `lock_source` column is clearer and avoids FK constraint issues).

---

### D7: Audit log written in the service layer, not the controller or DB trigger

**Decision:** The `work-entries` service's `updateEntry` method calls `auditLogRepository.insert(...)` inside the same DB transaction as the entry update.

**Rationale:** Keeps audit writes atomic with the update. If the audit insert fails, the whole transaction rolls back — no phantom updates without a log entry. Business logic stays in the service, not scattered between controller and DB.

**Alternatives considered:** DB trigger on `work_entries` — rejected (hard to test, less transparent, can't include request-level context like admin user ID).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Auto-lock fires while an employee has an active timer | Block lock (manual and auto) if `timer_state` has any row for that month's date range; log a warning for auto-lock |
| Last-admin guard race condition | Use `SELECT … FOR UPDATE` inside a transaction (D4) |
| Project Manager accidentally gains admin access via missing role guard | Integration test for every admin route asserting 403 when called with a project-manager JWT |
| `checkMonthLock` middleware date extraction differs across endpoints | Standardise: body field is always `date` for single-entry endpoints and `month` (YYYY-MM) for month-level operations |
| Soft-delete of a client with active assignments doesn't cascade | Documented behaviour: admin must manually deactivate projects → tasks before deactivating client; UI shows a warning with child-entity count |

## Migration Plan

No existing data to migrate — building on the already-scaffolded DB schema from Epic 1. Deploy order:

1. Backend: deploy new routes and middleware (role guard, month-lock check, audit log service)
2. Frontend: deploy admin feature module with role-based route guards
3. Seed: confirm the initial admin seed user is active and accessible
4. Cron: verify `node-cron` auto-lock job registers on backend startup

Rollback: redeploy previous Docker image tag; no schema changes are introduced in this epic.

## Open Questions

| # | Question | Decision Applied |
|---|----------|-----------------|
| Q1 | Should deactivating a client auto-deactivate its projects and tasks? | No — manual cascade per entity (per general spec D9) |
| Q2 | Can a project manager view (read-only) other admin screens? | No — 403 on all non-assignment admin endpoints |
| Q3 | What happens if auto-lock finds incomplete reports? | Log a warning, lock anyway (per general spec Q37) |
| Q4 | Should `audit_log` track admin views of employee reports, or only edits? | Edits only — views are not sensitive enough to require auditing |
