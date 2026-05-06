# Time Watch — Employee Time Reporting System

A web application for employees to log daily work hours and absences, with an admin panel for managing users, clients, projects, and tasks.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Features](#features)
- [System Constants](#system-constants)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [CI/CD](#cicd)

---

## Overview

Time Watch provides a structured, unified mechanism for work-hour reporting — reducing errors, improving transparency between employees and management, and enabling clean absence and leave tracking.

**Key goals:**
- Simplified and accurate daily time reporting
- Real-time visibility into report status for managers
- Streamlined vacation and absence management
- A consistent reporting standard across all employees

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (mobile-first, Hebrew / RTL) |
| Backend | Node.js |
| Database | PostgreSQL |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions + free deployment service (Vercel / Render / Railway) |

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose installed

### Running the application

```bash
# Start all services (frontend, backend, database)
docker compose up

# Rebuild images and start
docker compose up --build

# Stop all services
docker compose down
```

The application is accessible from any modern browser (Chrome, Edge, Safari) on both desktop and mobile.

---

## Project Structure

```
/
├── frontend/   # React app — Hebrew/RTL, mobile-first
├── backend/    # Node.js REST API
└── db/         # PostgreSQL schema and migrations
```

**Data hierarchy:** Client → Project → Task → User assignment

Users are assigned directly to **tasks** (not to clients or projects). The reporting UI automatically filters the dropdown lists to show only clients and projects that contain tasks assigned to the current user.

---

## User Roles

### Regular User (Employee)

- Report daily work hours and absences
- View own report history
- Edit reports until the month is locked by an admin

### Admin

All employee capabilities, plus:

- **User management** — create, edit, deactivate users; reset passwords
- **Client management** — add, edit, deactivate clients
- **Project management** — add, edit, deactivate projects (linked to a client)
- **Task management** — add, edit, close tasks (linked to a project)
- **User-task assignments** — assign employees to specific tasks
- **Edit any employee's reports**
- **Month locking / unlocking** — freeze all reports for a given month; lock metadata (timestamp + who locked) is stored

> All deletions are **soft deletes** — historical data is never permanently removed.

---

## Features

### Authentication

- Email + password login
- Users are created by admins only (including the initial password)
- JWT-based session management

### Daily Time Reporting

The default screen shown after login. The goal is to minimize friction — maximum information, minimum clicks.

**Report fields (all required):**

| Field | Details |
|---|---|
| Date | Date picker, defaults to today |
| Work location | Office / Client site / Home |
| Start time | Defaults to current time; supports manual entry or timer |
| End time | Defaults to current time; supports manual entry or timer |
| Client | Dropdown — only clients with assigned tasks shown; auto-selects if only one |
| Project | Dropdown — filtered by selected client; auto-selects if only one |
| Task | Dropdown — filtered by selected project; auto-selects if only one |
| Description | Free-text field |

**Validations:**
- End time before start time → error
- Total hours below daily standard (9h) → warning
- Total hours above daily standard → warning

**Multi-task reporting:** A single day can have multiple report rows (different clients, projects, or tasks). The system tracks remaining hours to allocate and prevents closing the report until all hours are assigned.

**Timer mode:** Start/stop work buttons capture time automatically; remaining fields are filled on stop.

**Editing:** Reports can be edited retroactively until the admin locks the month.

### Absence Reporting

**Absence types:** Vacation, Sick leave, Military reserve duty, Other

| Field | Details |
|---|---|
| Type | Dropdown from fixed list |
| Dates | Single date or date range (Fri–Sat automatically excluded) |
| Partial day | Half-day option; requires a complementary hours report for the rest of the day |
| Document | Sick leave and reserve duty require an uploaded document (can be added after initial submission) |

### Monthly View

- Calendar with a daily status indicator: complete / missing / irregular
- Full list of reports with details: date, duration (from–to), client, project, task, description
- Click any report to edit it

### Admin Panel

- Employee list: full name, email, role, active/inactive status
- Full CRUD for users, clients, projects, tasks
- User-task assignment management
- View and edit any employee's reports (all changes are logged)
- Month lock / unlock

---

## System Constants

| Parameter | Value |
|---|---|
| Daily standard hours | 9 |
| Work locations | Office, Client site, Home |
| Absence types | Vacation, Sick leave, Military reserve duty, Other |
| User types | Regular, Admin |

Friday and Saturday are automatically excluded from absence date range calculations.

---

## Development Workflow

- `main` / `master` is branch-protected — no direct pushes
- All changes via Pull Requests with at least **1 code review** before merge
- All CI tests must pass before merge

**Feature build order:**

1. Setup & Infrastructure — Docker Compose, DB schema, CI/CD pipelines
2. Authentication — user creation by admin, login, JWT sessions
3. Admin CRUD — users, clients, projects, tasks, assignments
4. Employee Time Reporting — manual entry, multi-task per day, edit, monthly calendar view
5. Absences — types, date ranges, partial-day, document uploads
6. Advanced Features — timer, month lock/unlock, admin editing employee reports
7. Documentation — Swagger API docs, README

---

## Testing

- Tests are written **per feature during development** (not after)
- Minimum **60% code coverage** required
- All tests must pass before any merge to `main`

```bash
npm test   # or equivalent per package (Jest / Vitest)
```

---

## CI/CD

| Component | Tool |
|---|---|
| CI Pipeline | GitHub Actions |
| CD Pipeline | Free service of team's choice (Vercel, Render, Railway, etc.) |
| Gate | All tests must pass before merge |

---

## API Documentation

Swagger documentation is available at `/api-docs` when the backend is running.
