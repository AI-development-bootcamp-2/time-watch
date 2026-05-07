## Why

Israeli software teams lack a structured, Hebrew-native time reporting tool that integrates project/task hierarchies, absence management, and admin month-closing into one mobile-friendly product. Time Watch fills this gap by giving employees a frictionless daily reporting experience and giving admins full control over data, users, and billing cycles.

## What Changes

- New end-to-end time reporting web application built from scratch
- React + Vite frontend (Hebrew RTL, mobile-first for employees, desktop for admin panel)
- Node.js/Express REST API backend
- PostgreSQL database with full soft-delete support
- Docker + Docker Compose containerization of all services
- GitHub Actions CI pipeline with ≥60% unit test coverage gate
- CD pipeline to a free cloud provider (Vercel/Render/Railway)
- JWT-based authentication with account lockout after 3 failed attempts
- Role system: Employee, Project Manager (sub-admin), Admin
- Daily work-hour reporting with manual entry and server-side timer
- Absence reporting (חופשה, מחלה, מילואים, אחר) with document upload
- Admin entity management: users, clients, projects, tasks, user-task assignments
- Monthly calendar view with day-status indicators
- Month locking (auto on 1st, manual by admin) with audit trail
- Swagger API documentation and full README

## Capabilities

### New Capabilities

- `auth`: Email+password login, JWT session management, account lockout, password rules (≥8 chars, upper/lower/number/special), admin-only user creation
- `user-management`: Admin CRUD for users; role assignment (employee/project-manager/admin); soft-delete (inactive flag); guard against last-admin deactivation
- `project-manager-role`: Sub-admin who can only assign/remove users from projects; no other admin powers
- `client-management`: Admin CRUD for clients with active/inactive soft-delete
- `project-management`: Admin CRUD for projects scoped to clients; cascade deactivation is manual per entity
- `task-management`: Admin CRUD for tasks scoped to projects; user-task assignment (assignment drives what employees can report against)
- `daily-reporting`: Manual hours entry per day (date, location, client→project→task cascade, description, start/end time); 9h daily standard with over/under alerts; hard block >24h/day; no future dates; no midnight-crossing (user must split manually); multiple entries per day allowed; no overlap restriction
- `timer`: Server-side timer persists across browser close; one active timer at a time; auto-splits at midnight into two day records; abandoned timer saves start time only and resets at end of day
- `absence-reporting`: Types: חופשה/מחלה/מילואים/אחר; single date or date range (auto-excludes Fri–Sat); partial absence (half-day, requires complementary work hours); future absences allowed for מחלה/מילואים only; document upload (PDF/images, max 20MB, one file per absence, replaceable); absence spanning month boundary splits into two records; warning if work entry already exists on same day (with replace option)
- `monthly-view`: Calendar showing full/missing/exceptional status per day; Fri–Sat and holidays shown greyed/blocked; clickable entries for editing; Jewish holiday support via `@hebcal/core`
- `admin-reports`: Admin can view and edit any employee's reports; all changes audited
- `month-locking`: Auto-lock on 1st of each month; admin can manually lock/unlock any month; unlock scope is all employees for that month; incomplete reports produce warning only (auto-lock still proceeds); running timer blocks lock; locked month is fully immutable (no changes, no document uploads); lock event stores timestamp + actor

### Modified Capabilities

_(none — this is a greenfield project)_

## Impact

- **New repository**: full monorepo with `frontend/`, `backend/`, `docker-compose.yml`
- **Database**: PostgreSQL schema covering users, clients, projects, tasks, user_tasks, work_entries, absence_entries, timer_state, month_locks, audit_log
- **Dependencies**: React + Vite, Node.js/Express, pg (or Prisma/Knex), JWT, multer (file upload), `@hebcal/core`, react-big-calendar, date-fns, Docker, GitHub Actions
- **External services**: file storage for uploaded documents (local volume in dev; cloud bucket in prod TBD)
- **Testing**: Jest or Vitest; ≥80% unit coverage; all tests pass in CI before merge
- **Git workflow**: branch protection on main, mandatory PRs, minimum 1 reviewer
