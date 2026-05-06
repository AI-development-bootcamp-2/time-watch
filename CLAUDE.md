# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Time Reporting System** (מערכת דיווחי שעות) — A web app for employees to report daily work hours and absences, with an admin panel for managing users, clients, projects, and tasks.

- **Frontend**: React, mobile-first responsive, Hebrew (RTL) only
- **Backend**: Node.js
- **Database**: PostgreSQL
- **Containerization**: Docker + Docker Compose (all services run in containers)
- **CI/CD**: GitHub Actions; deployment to a free service (Vercel, Render, or Railway)

## Commands

Once the project is scaffolded, expected commands will be:

```bash
docker compose up          # Start all services (frontend, backend, db)
docker compose up --build  # Rebuild and start
docker compose down        # Stop all services
```

Tests must pass before any merge to `main`:
```bash
# Run tests (tool TBD — Jest or Vitest)
npm test                   # or equivalent per package
```

Minimum 60% code coverage is required. Write tests per feature during development (not after).

## Architecture

```
frontend/   React app (Hebrew/RTL, mobile-first)
backend/    Node.js REST API
db/         PostgreSQL schema and migrations
```

**Data model hierarchy**: Client → Project → Task → UserTask assignment  
Users are assigned to **tasks** (not clients/projects). The reporting UI derives accessible clients/projects from the user's task assignments.

**Two user roles**:
- **Regular (employee)**: report hours and absences, view own history, edit until month is locked
- **Admin**: all employee capabilities + manage users/clients/projects/tasks, edit any report, lock/unlock months

**Month locking**: Admin can lock a month, which freezes all reports for all users. Lock metadata (timestamp + who locked) is stored. Admin can reopen.

**Soft deletes** everywhere — historical data is never hard-deleted.

## Feature Build Order

Implement in this sequence (per spec roadmap):

1. **Setup & Infrastructure** — Docker Compose, DB schema, CI pipeline, CD pipeline
2. **Authentication** — Admin-created user registration, email/password login, JWT session management
3. **Admin CRUD** — Users, clients, projects, tasks, user-task assignments
4. **Employee Time Reporting** — Manual entry, multi-task per day, edit, monthly calendar view
5. **Absences** — Types: חופשה/מחלה/מילואים/אחר; date ranges; partial-day; mandatory document uploads for sick/reserves
6. **Advanced Features** — Timer (start/stop work), month close/lock, admin editing employee reports
7. **Documentation** — Swagger API docs, README with setup instructions

## System Constants

| Parameter | Value |
|---|---|
| Daily standard hours | 9 |
| Work locations | משרד, לקוח, בית |
| Absence types | חופשה, מחלה, מילואים, אחר |
| User types | רגיל, אדמין |

Friday and Saturday are automatically excluded from absence date range calculations.

## Git Workflow

- `main`/`master` is branch-protected — no direct pushes
- All changes via Pull Requests with at least 1 code review before merge
- All CI tests must pass before merge
