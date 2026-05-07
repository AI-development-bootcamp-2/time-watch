# Implementation Tasks

> Structure: Epic → Story → Task
> Write unit tests for every task before moving to the next.
> Build in the order listed — later stories depend on earlier ones.

---

## Epic 1 — Setting Infrastructure

### Story 1.1 — Project Scaffold
_As a developer, I want a working monorepo with all services running locally via Docker so the whole team can start on a clean, identical environment._

#### Task 1.1.1 — Monorepo directory structure
Create root repo with `frontend/` (React + Vite), `backend/` (Node.js/Express), and `docker-compose.yml`. Add `.env.example` with all required variables.

#### Task 1.1.2 — Docker Compose
Define three services: `db` (PostgreSQL 16), `backend` (Node.js, hot-reload via nodemon), `frontend` (Vite dev server). Verify `docker compose up` starts all three with correct port mappings and volume mounts.

#### Task 1.1.3 — Backend base setup
Express app with CORS, JSON body parser, cookie-parser, and a health-check route `GET /api/health → 200 OK`. Environment config via `dotenv`.

#### Task 1.1.4 — Frontend base setup
Vite + React project with RTL Hebrew support (`dir="rtl"`, `lang="he"` on `<html>`). Base router (React Router v6). Placeholder home and login pages. Proxy `/api` to the backend in `vite.config.js`.

---

### Story 1.2 — Database & Migrations
_As a developer, I want a versioned database schema so that the DB structure is reproducible and changes are tracked._

#### Task 1.2.1 — Migration tool setup
Install and configure Knex (or plain SQL runner). Create `migrations/` folder. Backend runs `knex migrate:latest` on startup.

#### Task 1.2.2 — Core entity tables
Migration: `users`, `clients`, `projects`, `tasks`, `user_tasks`.

#### Task 1.2.3 — Reporting tables
Migration: `work_entries`, `timer_state`, `absence_entries`.

#### Task 1.2.4 — Admin & audit tables
Migration: `month_locks`, `audit_log`.

#### Task 1.2.5 — Seed script
Seed one admin user (email + hashed password from env variable) so the system is usable after a fresh `docker compose up`.

---

### Story 1.3 — CI/CD Pipelines
_As a team, I want automated tests on every PR and auto-deploy on merge so we catch regressions early and always have a live environment._

#### Task 1.3.1 — GitHub Actions CI
`.github/workflows/ci.yml`: install deps, run tests (backend + frontend), fail if coverage < 80%. Branch protection: no direct push to `main`, 1 reviewer required.

#### Task 1.3.2 — CD pipeline
Configure chosen provider (Vercel for frontend, Render/Railway for backend). Auto-deploy on merge to `main`. Document env variable setup in README.

---

### Story 1.4 — Documentation
_As a new team member or reviewer, I want clear setup instructions and API docs so I can run and understand the system without asking anyone._

#### Task 1.4.1 — Swagger setup
Install `swagger-jsdoc` + `swagger-ui-express`. Expose docs at `GET /api/docs`. Document every endpoint as it is built throughout the project.

#### Task 1.4.2 — README
Write `README.md`: prerequisites, `docker compose up` steps, seed instructions, environment variables table, how to run tests, CD environment URLs.

---

## Epic 2 — User Login Logic

### Story 2.1 — Backend Authentication
_As a system, I want secure login with account lockout so that user accounts are protected against brute-force attacks._

#### Task 2.1.1 — User creation endpoint (admin-only)
`POST /api/users` — hash password with bcrypt, enforce complexity rules (≥8 chars, upper, lower, digit, special character), return 403 for non-admin callers.

#### Task 2.1.2 — Login endpoint
`POST /api/auth/login` — validate email + password, increment `failed_attempts` on wrong password, block login after 3 failed attempts, issue JWT in httpOnly SameSite=Strict cookie on success.

#### Task 2.1.3 — Logout endpoint
`POST /api/auth/logout` — clear the JWT cookie.

#### Task 2.1.4 — Current user endpoint
`GET /api/auth/me` — return the authenticated user's profile (id, name, email, role). Used by the frontend on page load to restore session.

---

### Story 2.2 — Auth Middleware & Route Guards
_As a developer, I want role-based middleware so that every route is protected without repeating logic in each controller._

#### Task 2.2.1 — JWT authenticate middleware
Read cookie, verify JWT, attach `req.user`. Return 401 if missing or expired. Apply to all routes except `POST /api/auth/login`.

#### Task 2.2.2 — Role-guard middleware
`requireRole(...roles)` middleware — return 403 if `req.user.role` is not in the allowed list. Apply to all admin and project-manager routes.

---

### Story 2.3 — Login UI
_As an employee, I want a login page in Hebrew so I can authenticate and reach my reporting screen._

#### Task 2.3.1 — Login page
React page at `/login`: email + password fields (RTL), submit button, inline error messages (wrong credentials / account locked). Redirect to home on success.

#### Task 2.3.2 — Auth context & protected routes
`AuthContext` — call `GET /api/auth/me` on app load, store user state. `ProtectedRoute` wrapper — redirect to `/login` if unauthenticated. Role-based route guard for admin-only pages.

---

## Epic 3 — Employee Interface (Client Interface)

### Story 3.1 — Manual Daily Reporting
_As an employee, I want to manually log my work hours for a day so that my time is accurately recorded against the right project and task._

#### Task 3.1.1 — Work entry backend
`POST /api/work-entries` — validate all fields server-side: no future dates, end > start, hard-block if day total would exceed 24h. `GET /api/work-entries?date=YYYY-MM-DD&userId=me`.

#### Task 3.1.2 — Daily report form (frontend)
Mobile-first home screen: date picker (default today, future dates disabled), location selector (משרד/לקוח/בית), start/end time fields. All fields required with inline validation messages.

#### Task 3.1.3 — Cascading client → project → task dropdowns
Dropdowns filtered by the user's task assignments. Auto-select if only one option. Alphabetical order with option to sort by reporting frequency. Re-filter on each parent selection change.

#### Task 3.1.4 — Daily progress indicator
Show total reported hours for the day vs. the 9h standard. Display soft alert (non-blocking) when total is under or over 9h. List existing entries for the day below the form.

#### Task 3.1.5 — Edit a work entry
Clicking an existing entry opens it pre-filled in the form. `PUT /api/work-entries/:id` — update and append to `audit_log`. Block save if month is locked (read-only mode).

---

### Story 3.2 — Timer
_As an employee, I want to start a timer when I begin work and stop it when I finish so I don't have to remember my exact hours._

#### Task 3.2.1 — Timer backend (start / stop / status)
`POST /api/timer/start` — create `timer_state` row; block if one already exists.
`POST /api/timer/stop` — compute duration, create `work_entry`, delete `timer_state`.
`GET /api/timer/status` — return active timer or null.

#### Task 3.2.2 — Timer UI
"התחל עבודה" button on home screen. Running state displayed prominently with elapsed time (polled from server). "סיום עבודה" opens a modal to fill in location, client, project, task, description before saving.

#### Task 3.2.3 — Midnight split cron
`node-cron` job at 00:00 daily: for each active `timer_state` from a previous day, close it with end = 23:59 and start a new `timer_state` at 00:00 for the new day.

---

### Story 3.3 — Absence Reporting
_As an employee, I want to report absences (vacation, sick, reserve duty, other) with supporting documents so my absence days are tracked properly._

#### Task 3.3.1 — Absence backend
`POST /api/absences` — validate type, date range (exclude Fri–Sat), future-date rule (only מחלה/מילואים allowed in future), month-boundary auto-split.
`PUT /api/absences/:id`.
`POST /api/absences/:id/document` — multer upload, PDF/image only, max 20MB, replaces existing file.

#### Task 3.3.2 — Absence form (frontend)
Type dropdown, date / date-range picker (Fri–Sat cells disabled), partial-absence toggle. File upload field (shown for מחלה/מילואים). If full-day absence conflicts with existing work entry, show warning modal with replace / cancel options.

---

### Story 3.4 — Monthly View
_As an employee, I want to see my entire month at a glance so I can spot missing days and review my reporting history._

#### Task 3.4.1 — Monthly data endpoint
`GET /api/work-entries?month=YYYY-MM&userId=me` — return entries + per-day totals + absence data. Backend computes day status: full / missing / exceptional.

#### Task 3.4.2 — Calendar grid (frontend)
`react-big-calendar` + `@hebcal/core` for Jewish holiday awareness. Each day cell coloured by status. Fri–Sat and holidays greyed and unclickable. Month navigation (prev / next).

#### Task 3.4.3 — Entry list & inline editing
Scrollable list below the calendar: date, from–to, client, project, task, description. Clicking an entry opens it in the edit form (Task 3.1.5). Locked-month entries are read-only.

---

## Epic 4 — Admin Interface

### Story 4.1 — User Management
_As an admin, I want to create, edit, and deactivate user accounts so I control who can access the system._

#### Task 4.1.1 — Users table (frontend)
Desktop-only admin page: table of all users (name, email, role, status). Filter by active/inactive. Open add/edit modal on row click or "Add" button.

#### Task 4.1.2 — Add / edit user modal
Fields: full name, email, role selector, active toggle, password reset field. Validate password complexity client-side. Call `POST /api/users` or `PUT /api/users/:id`.

#### Task 4.1.3 — Soft-delete (deactivate) with last-admin guard
`PATCH /api/users/:id/deactivate` — backend checks if user is the last active admin; return 400 with clear error if so. Frontend shows the error inline.

---

### Story 4.2 — Entity Management (Clients, Projects, Tasks)
_As an admin, I want to manage the client/project/task hierarchy so employees can report against the right structure._

#### Task 4.2.1 — Client management
Clients table + add/edit modal (name, contact optional, active toggle). `GET/POST/PUT /api/clients`. Soft-delete = mark inactive.

#### Task 4.2.2 — Project management
Projects table + add/edit modal (client dropdown — active only, name, active toggle). `GET/POST/PUT /api/projects`. Soft-delete = mark inactive.

#### Task 4.2.3 — Task management
Task list inside project detail screen + add/edit modal (name, status open/closed). `GET/POST/PUT /api/tasks`. Soft-delete = mark closed.

---

### Story 4.3 — Assignments & Project Manager Role
_As an admin or project manager, I want to assign employees to tasks so each person sees only the work they're responsible for._

#### Task 4.3.1 — Assignment UI
Assignment screen: select a user → checklist of tasks (grouped by client/project). Or select a task → checklist of users. Save adds/removes rows in `user_tasks`.

#### Task 4.3.2 — Assignment endpoints
`POST /api/user-tasks` and `DELETE /api/user-tasks` — allowed for admin and project-manager roles. All other admin endpoints return 403 for project managers.

---

### Story 4.4 — Employee Report Oversight
_As an admin, I want to view and edit any employee's time reports so I can correct mistakes and maintain accurate records._

#### Task 4.4.1 — Employee report view
Admin selects user + month → shows their full work-entry list (same layout as monthly view). Pulls from `GET /api/work-entries?userId=:id&month=YYYY-MM`.

#### Task 4.4.2 — Admin edit of employee entries
Clicking any entry opens the edit form. `PUT /api/work-entries/:id` already writes to `audit_log`. Locked-month entries shown read-only.

---

### Story 4.5 — Month Locking
_As an admin, I want to lock a completed month so that no one can alter historic reports after payroll is processed._

#### Task 4.5.1 — Month lock endpoints
`POST /api/month-locks` — block if any employee has an active timer for that month; insert lock record.
`DELETE /api/month-locks/:id` — unlock (removes record).
All `work_entries` and `absence_entries` write endpoints check `month_locks` before proceeding.

#### Task 4.5.2 — Auto-lock cron
`node-cron` job at 00:00 on the 1st of each month: auto-insert lock for the previous month (actor = "system"). If incomplete reports exist, log a warning for admin review.

#### Task 4.5.3 — Month closing UI
Admin screen: list of months with lock status badge. Lock / Unlock buttons. Warning indicator if any employee has unreported days or an active timer. Confirmation dialog before locking.
