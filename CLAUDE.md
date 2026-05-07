# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Time Watch** — A web app for employees to report daily work hours and absences, with an admin panel for managing users, clients, projects, and tasks.

- **Frontend**: React with Vite + TypeScript (convert exiting files from js to ts if needed), mobile-first responsive, Hebrew (RTL) only
- **Backend**: Node.js REST API (TypeScript)
- **Database**: PostgreSQL
- **Containerization**: Docker + Docker Compose (all services run in containers)
- **CI/CD**: GitHub Actions; deployment to a free service (Vercel, Render, or Railway)

## Commands

```bash
docker compose up          # Start all services (frontend, backend, db)
docker compose up --build  # Rebuild and start
docker compose down        # Stop all services
```

Tests must pass before any merge to `main`. Minimum 80% code coverage required. Write tests per feature during development (not after):
```bash
npm test   # or equivalent per package (Jest / Vitest — TBD at scaffold time)
```
Every new route must include a @swagger JSDoc comment before the PR is merged.

Swagger API docs available at `/api-docs` when the backend is running.

## Architecture

```
frontend/   React + Vite + TypeScript (Hebrew/RTL, mobile-first)
backend/    Node.js REST API (TypeScript)
db/         PostgreSQL schema and migrations
```

**Data model hierarchy**: Client → Project → Task → UserTask assignment  
Users are assigned to **tasks** (not clients/projects). The reporting UI derives accessible clients/projects from the user's task assignments — dropdowns auto-filter and auto-select when only one option exists.

**Two user roles**:
- **Regular (employee)**: report hours and absences, view own history, edit until month is locked
- **Admin**: all employee capabilities + manage users/clients/projects/tasks, edit any report, lock/unlock months. All admin edits to employee reports are logged.

**User creation**: Admins create all users (including initial password). No self-registration flow.

**Month locking**: Admin can lock a month, which freezes all reports for all users. Lock metadata (timestamp + who locked) is stored. Admin can reopen.

**Soft deletes** everywhere — historical data is never hard-deleted.

## Feature Build Order

Implement in this sequence (per spec roadmap):

1. **Setup & Infrastructure & Documentation** — Docker Compose, DB schema, CI pipeline, CD pipeline
2. **Employee Time Reporting** — Manual entry, multi-task per day, edit, monthly calendar view, Timer (start/stop work), month close/lock
3. **Authentication** — Admin-created user registration, email/password login, JWT session management
4. **Admin CRUD** — Users, clients, projects, tasks, user-task assignments, admin editing employee reports
5. **Absences** — Types: חופשה/מחלה/מילואים/אחר; date ranges; partial-day; mandatory document uploads for sick/reserves

## Business Rules

### Time Reporting Validations
- End time before start time → **error**
- Total hours below 9h daily standard → **warning**
- Total hours above 9h daily standard → **warning**
- A single day supports multiple report rows (different clients/projects/tasks). The UI tracks remaining hours to allocate and blocks closing the report until all hours are assigned.
- Timer mode: start/stop buttons auto-capture start/end times; remaining fields filled on stop.

### Absences
- Partial-day absence requires a complementary hours report for the rest of the day.
- Sick leave and military reserve duty require a document upload (can be submitted after initial report).
- Friday and Saturday are automatically excluded from absence date range calculations.

### Monthly View
- Calendar with per-day status indicator: complete / missing / irregular.

## System Constants

| Parameter | Value |
|---|---|
| Daily standard hours | 9 |
| Work locations | משרד, לקוח, בית |
| Absence types | חופשה, מחלה, מילואים, אחר |
| User types | רגיל, אדמין |

## Git Workflow

- `main`/`master` is branch-protected — no direct pushes
- All changes via Pull Requests with at least 1 code review before merge
- All CI tests must pass before merge
