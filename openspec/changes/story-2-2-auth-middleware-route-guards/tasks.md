# SCRUM-102
## 1. [Backend] authenticate middleware — JWT cookie verification

- [x] 1.1 Verify `authenticate` reads the JWT from `req.cookies?.token` (the httpOnly cookie)
- [x] 1.2 Verify `jwt.js` reads the secret exclusively from `process.env.JWT_SECRET` and throws on startup if it is not set — the value must never be hardcoded
- [x] 1.3 Verify `authenticate` attaches `{ id: payload.sub, role: payload.role }` to `req.user` on a valid token and calls `next()` with no arguments
- [x] 1.4 Verify `authenticate` calls `next(new UnauthorizedError())` (401) when no `token` cookie is present
- [x] 1.5 Verify `authenticate` calls `next(new UnauthorizedError())` (401) when the token is expired
- [x] 1.6 Verify `authenticate` calls `next(new UnauthorizedError())` (401) when the token signature does not match `JWT_SECRET`
- [x] 1.7 Register `authenticate` as global middleware in `app.js`, placed after `cookieParser()` and before any route mounts
- [x] 1.8 Exempt the following paths from global authentication: `POST /api/auth/login`, `GET /api/health`, and all paths under `/api-docs`
- [x] 1.9 Create `backend/src/__tests__/authMiddleware.test.js`; mock `../utils/jwt` so `verifyToken` is controllable without hitting a real secret
- [x] 1.10 Unit test: missing cookie → `next` called with `UnauthorizedError` (401)
- [x] 1.11 Unit test: `verifyToken` throws `TokenExpiredError` → `next` called with `UnauthorizedError` (401)
- [x] 1.12 Unit test: `verifyToken` throws `JsonWebTokenError` (bad signature) → `next` called with `UnauthorizedError` (401)
- [x] 1.13 Unit test: valid token → `req.user` set to `{ id: payload.sub, role: payload.role }`, `next()` called with no arguments
- [x] 1.14 Integration test: `POST /api/auth/login` without a cookie reaches the login handler and does not return 401
- [x] 1.15 Integration test: `GET /api/health` without a cookie → 200
- [x] 1.16 Integration test: `GET /api-docs` without a cookie → does not return 401

## 2. [Backend] requireRole middleware — RBAC

- [x] 2.1 In `auth.js`, split the single `if (!req.user || !roles.includes(...))` into two sequential checks
- [x] 2.2 First check: if `req.user` is `undefined`, call `next(new UnauthorizedError())` — 401, not 403 (signals a middleware ordering bug)
- [x] 2.3 Second check: if `req.user.role` is not in the allowed roles list, call `next(new ForbiddenError())` — 403
- [x] 2.4 Unit test: `req.user` undefined → `next` called with `UnauthorizedError` (401)
- [x] 2.5 Unit test: `req.user.role` is `'employee'`, `requireRole('admin')` → `next` called with `ForbiddenError` (403)
- [x] 2.6 Unit test: `req.user.role` is `'admin'`, `requireRole('admin')` → `next()` called with no arguments
- [x] 2.7 Unit test: `requireRole('admin', 'manager')` with `'admin'` role → `next()` called
- [x] 2.8 Unit test: `requireRole('admin', 'manager')` with `'manager'` role → `next()` called

## 3. [Backend] Protect admin-only routes

- [x] 3.1 Remove the redundant `authenticate` argument from the `POST /` handler in `routes/users.js` — keep `requireRole('admin')` and `create`
- [x] 3.2 Add `const { requireRole } = require('../middleware/auth')` and `router.use(requireRole('admin'))` at the top of `routes/clients.js` (before any route definitions)
- [x] 3.3 Add `requireRole('admin')` guard to `routes/projects.js`
- [x] 3.4 Add `requireRole('admin')` guard to `routes/tasks.js`
- [x] 3.5 Add `requireRole('admin')` guard to `routes/months.js`
- [x] 3.6 Add `requireRole('admin')` guard to `routes/admin.js`
- [x] 3.7 Integration test: `POST /api/users` without cookie → 401
- [x] 3.8 Integration test: `POST /api/users` with employee JWT → 403
- [x] 3.9 Integration test: `POST /api/users` with admin JWT and valid body → 201
- [x] 3.10 Create `backend/src/__tests__/adminRoutes.guard.test.js`: unauthenticated request to `/api/clients` → 401
- [x] 3.11 Same file: employee JWT to `/api/clients` → 403
- [x] 3.12 Run `npm test` from `backend/` and confirm all tests pass with no regressions
- [x] 3.13 Confirm test coverage is at or above the 60% minimum threshold

# SCRUM-103
## 1. [Backend] requireRole middleware — RBAC

### Middleware implementation

- [x] 1.1 Verify `requireRole(...roles)` is implemented as a factory function that returns an Express middleware (not a middleware itself)
- [x] 1.2 Verify the role is read exclusively from `req.user.role` (JWT payload) — never from `req.body`, `req.query`, or any other request property
- [x] 1.3 Verify: `req.user` undefined → `next(new UnauthorizedError())` — 401 (signals middleware was not applied before requireRole)
- [x] 1.4 Verify: `req.user.role` not in the allowed roles list → `next(new ForbiddenError())` — 403
- [x] 1.5 Verify: `req.user.role` in the allowed roles list → `next()` with no arguments

### Route integration

- [x] 1.6 `POST /api/users` is guarded by `requireRole('admin')`
- [x] 1.7 All routes under `/api/clients`, `/api/projects`, `/api/tasks`, `/api/month-locks`, and `/api/admin` are guarded by `requireRole('admin')`
- [x] 1.8 `absences` routes are NOT guarded by a role check (employee access)

### Unit tests

- [x] 1.9  `req.user` undefined → next called with `UnauthorizedError` (401)
- [x] 1.10 `requireRole('admin')` with role `'employee'` → next called with `ForbiddenError` (403)
- [x] 1.11 `requireRole('admin')` with role `'admin'` → next() called with no arguments
- [x] 1.12 `requireRole('admin', 'manager')` with role `'admin'` → next() called
- [x] 1.13 `requireRole('admin', 'manager')` with role `'manager'` → next() called

### Edge cases

- [x] 1.14 `req.body.role` is `'admin'` but `req.user.role` is `'employee'` → 403 (proves body is never read)
- [x] 1.15 `req.user.role` is `undefined` (token issued without a role claim) → 403 (treated as non-matching, not as missing-user)
- [x] 1.16 `requireRole()` called with an empty roles list → any authenticated user returns 403

### Integration tests

- [x] 1.17 `POST /api/users` — no cookie → 401
- [x] 1.18 `POST /api/users` — employee JWT → 403
- [x] 1.19 `POST /api/users` — admin JWT with valid body → 201
- [x] 1.20 Unauthenticated request to `/api/clients` → 401
- [x] 1.21 Employee JWT to `/api/clients` → 403
- [x] 1.22 Admin JWT to `/api/clients` → passes the guard (not 401/403)

### Verification

- [x] 1.23 Run `npm test` from `backend/` — all tests pass, no regressions
- [x] 1.24 Confirm test coverage is at or above the 60% minimum threshold
