## Why

The Time Watch application needs a fully functional Admin Interface so that administrators can manage users, the client/project/task hierarchy, employee assignments, report oversight, and monthly locking — all of which are prerequisites before employees can report time against the correct structure.

## What Changes

- New admin-only navigation section (desktop-oriented, RTL Hebrew)
- User management: create, edit, deactivate users; guard against removing the last active admin
- Entity management: CRUD for clients, projects, and tasks in a hierarchy (Client → Project → Task)
- Assignment management: assign employees to tasks; introduce Project Manager sub-role (can only manage assignments)
- Employee report oversight: admin can view and edit any employee's work entries; all edits audited
- Month locking: admin can manually lock/unlock any month; auto-lock cron fires on the 1st; all write endpoints enforce lock status

## Capabilities

### New Capabilities

- `admin-user-management`: Admin CRUD for users — create with initial password, edit name/email/role, soft-deactivate; last-active-admin guard prevents the system from becoming unreachable
- `admin-entity-management`: Admin CRUD for clients, projects, and tasks in a strict hierarchy; soft-delete (inactive flag) on all entities; deactivation is manual per entity (no cascade)
- `admin-assignments`: Assign/remove employees from tasks via `user_tasks` join table; Project Manager role restricted exclusively to this capability
- `admin-report-oversight`: Admin can view any employee's monthly work-entry list and edit individual entries; all admin edits appended to `audit_log`
- `admin-month-locking`: Manual lock/unlock of any month by admin; auto-lock cron on the 1st of each month (actor = "system"); all work-entry and absence-entry write endpoints check `month_locks` before proceeding; running timers block lock

### Modified Capabilities

- `auth`: Project Manager role added alongside Employee and Admin; role-guard middleware must enforce Project Manager's restricted access (403 for all admin endpoints except assignment endpoints)

## Impact

- **Frontend**: New admin feature module under `frontend/src/features/admin/` — pages for Users, Clients, Projects, Tasks, Assignments, Report Oversight, and Month Locking
- **Backend**: New or extended routes in `backend/src/routes/` — `users.js`, `clients.js`, `projects.js`, `tasks.js`, `user-tasks.js`, `admin-reports.js`, `months.js`; role middleware extended for Project Manager
- **Database**: Tables `users`, `clients`, `projects`, `tasks`, `user_tasks`, `month_locks`, `audit_log` — all already defined in the base schema; no new tables required
- **Cron job**: `node-cron` auto-lock job added to backend startup
- **Dependencies**: No new npm packages beyond what is already planned (node-cron, pg/Knex, JWT middleware)
