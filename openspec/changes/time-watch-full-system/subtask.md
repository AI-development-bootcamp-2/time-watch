# Subtasks — Story 1.1: Project Scaffold

---

## Subtask 1 — Create monorepo root structure
Create the root directory layout:
```
/
├── frontend/
├── backend/
├── .env.example
├── .gitignore
└── docker-compose.yml (empty placeholder)
```
`.gitignore` must exclude `node_modules/`, `.env`, and build artifacts.

---

## Subtask 2 — `.env.example`
Create `.env.example` at the root with all required variables:
```
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
NODE_ENV=
PORT=
FRONTEND_URL=
```

---

## Subtask 3 — Docker Compose: `db` service
Add the `db` service to `docker-compose.yml`:
- Image: `postgres:16`
- Env vars from `.env`
- Named volume `pgdata` mounted to `/var/lib/postgresql/data`
- Port mapping `5432:5432`
- Health check: `pg_isready`

---

## Subtask 4 — Docker Compose: `backend` service
Add the `backend` service to `docker-compose.yml`:
- Build from `./backend`
- Port mapping `3000:3000`
- Depends on `db` (with health condition)
- Volume mount `./backend:/app` for hot-reload
- Env vars from `.env`

---

## Subtask 5 — Docker Compose: `frontend` service
Add the `frontend` service to `docker-compose.yml`:
- Build from `./frontend`
- Port mapping `5173:5173`
- Depends on `backend`
- Volume mount `./frontend:/app` for hot-reload
- Env var `VITE_API_URL=http://localhost:3000`

---

## Subtask 6 — Backend: scaffold Express app
Inside `backend/`:
```
backend/
├── Dockerfile
├── package.json
├── nodemon.json
└── src/
    ├── index.js       ← app entry point
    └── routes/
        └── health.js  ← GET /api/health
```
Install: `express`, `cors`, `cookie-parser`, `dotenv`, `nodemon` (dev).

---

## Subtask 7 — Backend: health-check route
Implement `GET /api/health` in `src/routes/health.js`:
```js
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```
Mount at `/api` in `src/index.js`. Verify with `curl http://localhost:3000/api/health`.

---

## Subtask 8 — Frontend: scaffold Vite + React
Inside `frontend/`:
```
frontend/
├── Dockerfile
├── package.json
├── vite.config.js
├── index.html          ← lang="he" dir="rtl"
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css       ← Tailwind directives
    └── pages/
        ├── Home/index.jsx
        └── Login/index.jsx
```
Install: `react`, `react-dom`, `react-router-dom`, `prop-types`, `tailwindcss`, `@vitejs/plugin-react`.

---

## Subtask 9 — Frontend: API proxy + React Router
In `vite.config.js` add proxy:
```js
server: {
  proxy: {
    '/api': 'http://backend:3000'
  }
}
```
In `App.jsx` set up React Router v6 with two routes:
- `/` → `<Home />`
- `/login` → `<Login />`

Both pages are Hebrew placeholders with `dir="rtl"`.

---

## Subtask 10 — Smoke test: `docker compose up`
Verify the full stack boots correctly:
- [ ] `docker compose up --build` completes with no errors
- [ ] `http://localhost:5173` renders the React placeholder page
- [ ] `http://localhost:3000/api/health` returns `{ "status": "ok" }`
- [ ] Frontend `/api/health` call via proxy succeeds (no CORS errors in console)
- [ ] `docker compose down` stops all three containers cleanly
