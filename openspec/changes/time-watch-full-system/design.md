## Context

Time Watch is a greenfield Hebrew-language employee time-reporting web application for an AI Bootcamp final project. There is no existing codebase to migrate. The system must support three user roles (Employee, Project Manager, Admin), a hierarchical entity model (Client → Project → Task → User Assignment), daily work reporting with a server-side timer, absence management with document upload, and a monthly lock/unlock cycle. The frontend is mobile-first for employees; the admin panel is desktop-only.

Key constraints from the course spec:
- React + Vite + Node.js + PostgreSQL stack (non-negotiable)
- Docker + Docker Compose for all services
- GitHub Actions CI; ≥80% unit test coverage required for merge
- Hebrew RTL only
- Tests written per feature during development

## Goals / Non-Goals

**Goals:**
- Deliver all 24 roadmap features in the recommended order
- Clean separation of concerns: React SPA ↔ REST API ↔ PostgreSQL
- JWT authentication with proper security (lockout, password rules)
- Server-side timer that survives browser close
- Full soft-delete across all entities (historical data preserved)
- Month locking that is immutable once applied (no changes post-lock)
- Swagger docs and README for submission

**Non-Goals:**
- Real-time collaboration (websockets, live updates)
- Email notifications or password reset flows
- Mobile native app (web responsive only)
- Payroll integration or export formats beyond the UI
- Multi-language support (Hebrew only)
- Retroactive reporting limit beyond month-close (nice-to-have only)
- Sequential password restriction (nice-to-have only)

## Decisions

### D1: Monorepo with separate frontend/backend directories

**Decision:** Single Git repo with `frontend/` (React + Vite) and `backend/` (Node.js) subdirectories, orchestrated by `docker-compose.yml` at the root.

**Rationale:** Simplifies CI, shared environment config, and developer onboarding. Avoids cross-repo coordination overhead for a course project with a small team.

**Alternatives considered:** Separate repos — rejected because it adds friction for a team of this size with no polyglot deployment needs.

---

### D2: JWT stored in httpOnly cookie (not localStorage)

**Decision:** Issue JWTs as httpOnly, SameSite=Strict cookies. No token in localStorage.

**Rationale:** Prevents XSS token theft. The course spec mentions "information security requirements" for saving login details; httpOnly cookies satisfy this without a full refresh-token rotation scheme.

**Alternatives considered:** localStorage — rejected (XSS risk); sessionStorage — rejected (doesn't survive tab close, breaking UX).

---

### D3: PostgreSQL with raw SQL via `pg` (or Knex query builder)

**Decision:** Use `pg` directly or `knex` for query building. No full ORM (no Prisma/Sequelize).

**Rationale:** Keeps the team close to the SQL the course is teaching. Schema migrations via plain `.sql` files or `knex migrate`. Avoids ORM abstraction magic that hides query behaviour.

**Alternatives considered:** Prisma — rejected (adds abstraction layer and schema drift risk for beginners); Sequelize — rejected (similar reasons).

---

### D4: Server-side timer state in `timer_state` table

**Decision:** Store active timer as a row: `(user_id, start_time, date)`. On stop, compute duration and create a work entry. Midnight split is handled by a scheduled check (or on next open) that closes day-1 entry at 23:59 and opens day-2 entry at 00:00.

**Rationale:** Timer must survive browser close (Q12 answer: yes). Server is the source of truth. The client polls or reads timer state on page load.

**Alternatives considered:** Client-side timer with periodic sync — rejected (loses state on crash/close).

---

### D5: File uploads stored on local Docker volume (dev) 

**Decision:** Use `multer` for multipart upload handling. In dev, files land in a mounted Docker volume. The backend serves them via a static route. Production deployment can swap to S3/R2/GCS by changing the storage adapter.

**Rationale:** Keep dev simple. One file per absence, replaceable, max 20MB (PDF or image).

**Alternatives considered:** Store blobs in PostgreSQL — rejected (bloat, poor performance for files this size).

---

### D6: Jewish holiday data via `@hebcal/core` (manual config)

**Decision:** Holidays are configured manually in the backend (admin-seeded or config file). `@hebcal/core` is used on the frontend to render the calendar with holiday awareness (greyed/blocked days).

**Rationale:** Q4 answer: configure holidays manually. Library handles Hebrew date calculations; admin still controls which holidays apply to the organisation.

---

### D7: Month lock is global (all employees for that month)

**Decision:** `month_locks` table has `(year, month, locked_by, locked_at)`. Lock applies to all users for that month. No per-employee lock granularity.

**Rationale:** Q36 answer: unlock reopens for all employees. Simplifies enforcement — every write checks `month_locks` before proceeding.

---

### D8: Role enforcement via middleware on every protected route

**Decision:** Express middleware chain: `authenticate` (validates JWT) → `requireRole(...roles)` (checks user type). Applied per-route, not per-controller.

**Rationale:** Clear, auditable access control. Project Manager role only exposes user-assignment endpoints. Admin has full access. Employees have reporting endpoints only.

---

### D9: Soft delete everywhere via `is_active` / `is_deleted` flag

**Decision:** No `DELETE` statements on core entities. Users, clients, projects, tasks are soft-deleted. Historical work entries referencing deactivated entities remain intact and readable.

**Rationale:** Q22/Q23 answers confirm historical data must be preserved. Admin deactivation cascades (client → projects → tasks) must be done manually per entity (Q24 answer).

---

### D10: Auto-lock cron job runs at midnight on the 1st

**Decision:** A `node-cron` job (or a scheduled DB function) fires at 00:00 on the 1st of each month and inserts a lock record for the previous month. Incomplete reports produce a warning in the UI but do not block auto-lock.

**Rationale:** Q5/Q37 answers: auto-lock on 1st, incomplete reports are warning-only, auto-lock still happens.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Timer midnight split creates partial/incomplete entries | Test midnight split logic with unit tests; add a manual "repair" admin endpoint |
| File storage not portable between dev and prod | Abstract behind a `StorageService` interface; swap implementation via env variable |
| JWT cookie SameSite=Strict blocks cross-origin dev requests | Configure CORS + cookie settings per environment via `.env` |
| Last-admin guard race condition (two admins deactivate simultaneously) | Use a DB transaction with a count check before committing deactivation |
| Auto-lock fires while a timer is running for a user | Q20 answer: timer running at lock time "can't be" — block lock if any user has active timer |
| Questions 32–40 partially unanswered | Reasonable defaults applied (see Open Questions); revisit with instructor |

## Folder Layout

```
time-watch/
├── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
│
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── assets/
│       ├── components/           # Shared/reusable UI components
│       │   ├── ui/               # Generic primitives (Button, Input, Modal…)
│       │   └── layout/           # AppShell, Sidebar, Header, BottomNav
│       ├── features/             # Feature-scoped modules
│       │   ├── auth/
│       │   │   ├── LoginPage.jsx
│       │   │   └── authSlice.js
│       │   ├── daily-reporting/
│       │   │   ├── DailyReportPage.jsx
│       │   │   ├── ReportForm.jsx
│       │   │   └── TimerWidget.jsx
│       │   ├── absences/
│       │   │   ├── AbsencePage.jsx
│       │   │   └── AbsenceForm.jsx
│       │   ├── monthly-view/
│       │   │   └── MonthlyCalendar.jsx
│       │   └── admin/
│       │       ├── UsersPage.jsx
│       │       ├── ClientsPage.jsx
│       │       ├── ProjectsPage.jsx
│       │       ├── TasksPage.jsx
│       │       └── AdminReportsPage.jsx
│       ├── hooks/                # Shared custom hooks
│       ├── services/             # API client (axios/fetch wrappers)
│       ├── store/                # Redux / Zustand global state
│       └── utils/                # Helpers (date formatting, validation…)
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js              # Express app entry point
│       ├── config/               # Env vars, constants
│       ├── middleware/           # Auth (JWT), error handler, upload (multer)
│       ├── routes/               # Express routers (one file per domain)
│       │   ├── auth.js
│       │   ├── users.js
│       │   ├── clients.js
│       │   ├── projects.js
│       │   ├── tasks.js
│       │   ├── reports.js
│       │   ├── absences.js
│       │   ├── timer.js
│       │   ├── months.js
│       │   └── admin.js
│       ├── controllers/          # Request handlers (thin, delegates to services)
│       ├── services/             # Business logic
│       ├── repositories/         # DB queries (pg / Knex)
│       └── utils/                # Helpers (jwt, bcrypt, date utils…)
│
├── db/
│   ├── schema.sql                # Full DDL (tables, indexes, constraints)
│   └── migrations/               # Incremental migration files
│       └── 001_initial_schema.sql
│
└── uploads/                      # Local dev volume for document uploads
```

### Key Conventions

- **Monorepo**: `frontend/` and `backend/` are independent Node packages; root has only Docker and CI config.
- **Feature folders**: each feature owns its pages, components, and state slice — no cross-feature imports except through `services/` or `types/`.
- **Backend layers**: routes → controllers → services → repositories. Controllers never touch the DB directly.
- **Soft deletes**: all domain tables have an `is_active` (or `deleted_at`) column; hard deletes are never used.
- **Uploads**: stored under `uploads/` in development (Docker volume); production uses a cloud bucket (TBD).
- **Tests**: co-located with source files (`*.test.js`) or in a `__tests__/` folder per feature.

## Migration Plan

_Greenfield project — no migration from existing system._

1. Run `docker compose up` to spin up Postgres, backend, frontend
2. Backend runs `knex migrate:latest` on startup to apply schema
3. Admin seeds initial admin user via a seed script or environment variable
4. CI runs `docker compose run backend npm test` on every PR
5. CD deploys on merge to main via Vercel (frontend) + Render (backend) or Railway (both)

**Rollback:** Since this is a new system with no existing users, rollback = redeploy previous Docker image tag.

## Open Questions

| # | Question | Decision Applied |
|---|----------|-----------------|
| Q32 | Can documents be uploaded after month lock? | No — locked month is fully immutable |
| Q33 | Timer auto-split at midnight: create day-1 entry immediately at 00:00 or wait? | Create day-1 entry at midnight via cron; day-2 starts fresh |
| Q34 | Abandoned timer: what exactly is saved? | Only start_time is saved; timer_state row stays until user stops or end-of-day reset |
| Q35 | When is absence + work allowed vs trigger replacement? | Full absence replaces work; partial absence coexists with complementary work hours |
| Q36 | Month unlock scope? | All employees for that month |
| Q37 | Auto-lock with incomplete reports? | Auto-lock still fires; warning shown in UI |
| Q38 | Can admin add absence to locked month? | No — locked month is fully immutable |
| Q39 | Hard-block >24h? | Yes — hard block |
| Q40 | Login lockout duration and who unlocks? | Needs instructor answer; defaulting to 30-min auto-unlock |
| Q41 | Last admin guard | System blocks last admin from deactivating own account |
