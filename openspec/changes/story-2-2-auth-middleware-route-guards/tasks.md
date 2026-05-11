## 1. [Backend] authenticate middleware — JWT cookie verification

- [ ] 1.1 Verify `authenticate` reads the JWT from `req.cookies?.token` (the httpOnly cookie)
- [ ] 1.2 Verify `jwt.js` reads the secret exclusively from `process.env.JWT_SECRET` and throws on startup if it is not set — the value must never be hardcoded
- [ ] 1.3 Verify `authenticate` attaches `{ id: payload.sub, role: payload.role }` to `req.user` on a valid token and calls `next()` with no arguments
- [ ] 1.4 Verify `authenticate` calls `next(new UnauthorizedError())` (401) when no `token` cookie is present
- [ ] 1.5 Verify `authenticate` calls `next(new UnauthorizedError())` (401) when the token is expired
- [ ] 1.6 Verify `authenticate` calls `next(new UnauthorizedError())` (401) when the token signature does not match `JWT_SECRET`
- [ ] 1.7 Register `authenticate` as global middleware in `app.js`, placed after `cookieParser()` and before any route mounts
- [ ] 1.8 Exempt the following paths from global authentication: `POST /api/auth/login`, `GET /api/health`, and all paths under `/api-docs`
- [ ] 1.9 Create `backend/src/__tests__/authMiddleware.test.js`; mock `../utils/jwt` so `verifyToken` is controllable without hitting a real secret
- [ ] 1.10 Unit test: missing cookie → `next` called with `UnauthorizedError` (401)
- [ ] 1.11 Unit test: `verifyToken` throws `TokenExpiredError` → `next` called with `UnauthorizedError` (401)
- [ ] 1.12 Unit test: `verifyToken` throws `JsonWebTokenError` (bad signature) → `next` called with `UnauthorizedError` (401)
- [ ] 1.13 Unit test: valid token → `req.user` set to `{ id: payload.sub, role: payload.role }`, `next()` called with no arguments
- [ ] 1.14 Integration test: `POST /api/auth/login` without a cookie reaches the login handler and does not return 401
- [ ] 1.15 Integration test: `GET /api/health` without a cookie → 200
- [ ] 1.16 Integration test: `GET /api-docs` without a cookie → does not return 401

## 2. [Backend] requireRole middleware — RBAC

- [ ] 2.1 In `auth.js`, split the single `if (!req.user || !roles.includes(...))` into two sequential checks
- [ ] 2.2 First check: if `req.user` is `undefined`, call `next(new UnauthorizedError())` — 401, not 403 (signals a middleware ordering bug)
- [ ] 2.3 Second check: if `req.user.role` is not in the allowed roles list, call `next(new ForbiddenError())` — 403
- [ ] 2.4 Unit test: `req.user` undefined → `next` called with `UnauthorizedError` (401)
- [ ] 2.5 Unit test: `req.user.role` is `'employee'`, `requireRole('admin')` → `next` called with `ForbiddenError` (403)
- [ ] 2.6 Unit test: `req.user.role` is `'admin'`, `requireRole('admin')` → `next()` called with no arguments
- [ ] 2.7 Unit test: `requireRole('admin', 'manager')` with `'admin'` role → `next()` called
- [ ] 2.8 Unit test: `requireRole('admin', 'manager')` with `'manager'` role → `next()` called

## 3. [Backend] Protect admin-only routes

- [ ] 3.1 Remove the redundant `authenticate` argument from the `POST /` handler in `routes/users.js` — keep `requireRole('admin')` and `create`
- [ ] 3.2 Add `const { requireRole } = require('../middleware/auth')` and `router.use(requireRole('admin'))` at the top of `routes/clients.js` (before any route definitions)
- [ ] 3.3 Add `requireRole('admin')` guard to `routes/projects.js`
- [ ] 3.4 Add `requireRole('admin')` guard to `routes/tasks.js`
- [ ] 3.5 Add `requireRole('admin')` guard to `routes/months.js`
- [ ] 3.6 Add `requireRole('admin')` guard to `routes/admin.js`
- [ ] 3.7 Integration test: `POST /api/users` without cookie → 401
- [ ] 3.8 Integration test: `POST /api/users` with employee JWT → 403
- [ ] 3.9 Integration test: `POST /api/users` with admin JWT and valid body → 201
- [ ] 3.10 Create `backend/src/__tests__/adminRoutes.guard.test.js`: unauthenticated request to `/api/clients` → 401
- [ ] 3.11 Same file: employee JWT to `/api/clients` → 403
- [ ] 3.12 Run `npm test` from `backend/` and confirm all tests pass with no regressions
- [ ] 3.13 Confirm test coverage is at or above the 60% minimum threshold
