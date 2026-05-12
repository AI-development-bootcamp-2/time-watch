## Why

The `authenticate` and `requireRole` middleware exist in code but are applied inconsistently per-route, which means new routes can silently ship unprotected. Additionally, `requireRole` currently returns 403 when `req.user` is absent — masking a middleware-ordering bug that should surface as 401. Centralising auth in `app.js` and hardening the role guard removes the class of "forgot to add middleware" vulnerabilities before the Admin CRUD sprint begins.

## What Changes

- Register `authenticate` globally in `app.js` so every route is protected by default.
- Exempt only `POST /api/auth/login` from global authentication.
- Fix `requireRole`: return **401** when `req.user` is undefined (ordering bug), **403** when role is not allowed.
- Apply `requireRole('admin')` to `POST /api/users` (already in route file — keep as-is after global auth is added).
- Add `requireRole('admin')` guards to all existing skeleton admin-only routes (`/api/clients`, `/api/projects`, `/api/tasks`, `/api/month-locks`, `/api/admin`).
- Add dedicated unit tests for `authenticate` and `requireRole`, and route-level tests proving the global exemption and admin guard.

## Capabilities

### New Capabilities

- `auth-middleware`: Contract for the global `authenticate` middleware and the `requireRole` factory — inputs, outputs, error codes, and exemption rules.

### Modified Capabilities

<!-- No existing spec-level requirements are changing. -->

## Impact

- **`backend/src/middleware/auth.js`** — `requireRole` logic fix (split the 401/403 check).
- **`backend/src/app.js`** — global `authenticate` registration; exemption for `POST /api/auth/login`.
- **`backend/src/routes/users.js`** — remove redundant per-route `authenticate` call (kept by `requireRole`); verify `requireRole('admin')` stays.
- **`backend/src/routes/` (clients, projects, tasks, months, admin, absences)** — add `requireRole('admin')` where appropriate.
- **`backend/src/__tests__/`** — new `authMiddleware.test.js` unit test file; extend `auth.routes.test.js` and `users.routes.test.js` with middleware-specific cases.
- No schema changes, no new npm dependencies.
