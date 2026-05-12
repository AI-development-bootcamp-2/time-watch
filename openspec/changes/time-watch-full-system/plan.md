# Plan — Story 1.1: Project Scaffold

> Vision document — describes the intended end-state before any code is written.
> Derived from `subtask.md`. Implementation details live there; this file answers **why** and **what we're building toward**.

---

## Goal

By the end of Story 1.1, any developer on the team can clone the repo, run a single command, and have a fully working local environment — three containers talking to each other, a React page in the browser, and a live API.

```
docker compose up --build
```

That's it. No manual installs, no "works on my machine."

---

## What We're Building

```
┌─────────────────────────────────────────────────┐
│                  Developer Machine               │
│                                                  │
│  ┌──────────────┐   /api proxy   ┌────────────┐ │
│  │   Frontend   │ ─────────────► │  Backend   │ │
│  │  React+Vite  │                │  Express   │ │
│  │  :5173       │                │  :3000     │ │
│  └──────────────┘                └─────┬──────┘ │
│                                        │        │
│                                  ┌─────▼──────┐ │
│                                  │  Database  │ │
│                                  │ Postgres16 │ │
│                                  │  :5432     │ │
│                                  └────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Package manager | npm | Simple, no extra tooling |
| Frontend bundler | Vite | Fast dev server, native ESM |
| Backend hot-reload | nodemon | Restarts on file change inside Docker |
| DB version | PostgreSQL 16 | Latest stable, matches prod target |
| API proxy | Vite proxy | Avoids CORS in dev; frontend always calls `/api` |
| Env management | `.env` + `.env.example` | `.env` is gitignored; `.env.example` is the contract |

---

## End-State Checklist

When Story 1.1 is complete, all of these must be true:

### Repository
- [ ] `frontend/`, `backend/` directories exist with valid project scaffolds
- [ ] `.env.example` documents every required variable
- [ ] `.gitignore` excludes `node_modules/`, `.env`, build output

### Docker
- [ ] `docker-compose.yml` defines `db`, `backend`, `frontend` services
- [ ] `db` has a health check; `backend` waits for it before starting
- [ ] Volume mounts enable hot-reload on both frontend and backend
- [ ] Port mapping: `5173` (frontend), `3000` (backend), `5432` (db)

### Backend
- [ ] Express app starts cleanly with `nodemon`
- [ ] `GET /api/health` returns `{ "status": "ok" }` with HTTP 200
- [ ] CORS, JSON body parser, and cookie-parser are wired up
- [ ] All config read from environment variables via `dotenv`

### Frontend
- [ ] `<html lang="he" dir="rtl">` set in `index.html`
- [ ] React Router v6 configured with `/` and `/login` routes
- [ ] `/api` requests proxied to `http://backend:3000` via `vite.config.js`
- [ ] Tailwind CSS working (base styles applied)
- [ ] Two placeholder pages exist: `Home` and `Login` (Hebrew text)

### Integration
- [ ] `docker compose up --build` raises all three services with no errors
- [ ] Frontend can call `/api/health` through the proxy with no CORS errors
- [ ] `docker compose down` stops everything cleanly

---

## What This Is NOT

- No authentication yet (Story 2.1)
- No database schema or migrations yet (Story 1.2)
- No real pages or UI (Story 2.3+)
- No CI/CD pipeline yet (Story 1.3)

---

## Subtask Order

```
Subtask 1 → 2          (root skeleton)
     ↓
Subtask 3 → 4 → 5      (Docker Compose, service by service)
     ↓
Subtask 6 → 7          (Backend: Express + health route)
     ↓
Subtask 8 → 9          (Frontend: Vite + Router + proxy)
     ↓
Subtask 10             (Smoke test — full stack verification)
```
