## Context

The backend uses JWT stored in an HttpOnly cookie. Two middleware functions already exist in `middleware/auth.js`: `authenticate` (verifies the cookie token and attaches `req.user`) and `requireRole` (checks `req.user.role`). Currently each protected route manually imports and applies `authenticate`, meaning new routes can ship unprotected. `requireRole` also has a latent bug: when `req.user` is absent it emits a 403 (Forbidden) instead of 401 (Unauthenticated), hiding middleware ordering mistakes.

`POST /api/auth/login` is the only public endpoint. All other routes — including skeleton routes for clients, projects, tasks, month-locks, and admin — must be authenticated by default, with a role guard added for admin-only operations.

## Goals / Non-Goals

**Goals:**
- Single point of authentication registration in `app.js`.
- `requireRole` correctly distinguishes 401 (no user) from 403 (wrong role).
- All existing and future routes are protected unless explicitly opted out.
- Admin-only routes are guarded with `requireRole('admin')`.
- Dedicated unit tests for both middleware functions, and route-level tests proving the exemption and guards.

**Non-Goals:**
- Implementing new CRUD routes (clients, projects, tasks, etc.) — only adding guards to existing skeletons.
- Refresh token or token rotation logic.
- Permission scopes beyond the two-role model (`employee`, `admin`).

## Decisions

### 1. Global `authenticate` via `app.use` with path exclusion

Register `authenticate` as a global middleware in `app.js`, placed **after** `cookieParser` and **before** route mounts. Exempt `POST /api/auth/login` using an Express path matcher:

```js
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/api/auth/login') return next();
  authenticate(req, res, next);
});
```

**Why not a whitelist array?** A single exemption is cleaner than a list. If a second public endpoint is needed later, the pattern can be extended then.

**Why not move auth into a router-level apply?** That still requires per-router boilerplate and recreates the original problem as the router count grows.

**Alternative considered — skip middleware flag (`req.skipAuth`)**: More implicit; rejected because it requires route files to know about global middleware internals.

### 2. Split 401 / 403 in `requireRole`

Change the single condition into two sequential checks:

```js
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());       // 401 — middleware ordering bug
    if (!roles.includes(req.user.role)) return next(new ForbiddenError()); // 403 — wrong role
    next();
  };
}
```

This surfaces misconfiguration immediately (401 in tests = middleware not applied) rather than silently returning 403.

### 3. Remove redundant `authenticate` from `routes/users.js`

Once `authenticate` is global, the explicit call in `router.post('/', authenticate, requireRole('admin'), create)` becomes redundant. Remove `authenticate` from the chain; keep `requireRole('admin')`. This keeps the route file clean and avoids double-execution.

### 4. Admin guards on skeleton routes

For each skeleton router (`clients`, `projects`, `tasks`, `months`, `admin`), apply `router.use(requireRole('admin'))` at the top of the router file. This guards all future handlers in that file without requiring per-handler decoration.

`absences` router is **not** admin-only — employees create their own absences — so it gets no role guard (authentication alone via global middleware is sufficient).

### 5. Test strategy — unit tests for middleware, integration for routes

- **Unit tests** (`authMiddleware.test.js`): mock `verifyToken` and call middleware functions directly with fabricated `req`/`res`/`next` objects. Fast, isolated, no DB.
- **Route integration tests**: extend existing `auth.routes.test.js` and `users.routes.test.js` using `supertest` against the real `createApp()`. No additional mocking layer needed — consistent with the existing test style.

## Risks / Trade-offs

- **Accidental lock-out of `/api/health`** → The health endpoint has no auth today; it will be blocked after the global middleware is added. Fix: add `/api/health` to the exemption or move it before the auth middleware registration. Decision: move the health route registration above the global auth middleware in `app.js`.
- **Swagger UI blocked** → `/api-docs` will require a cookie after the change. Fix: add `/api-docs` to the exemption list alongside login. Decision: exempt the path prefix `/api-docs` in the global middleware.
- **Double `authenticate` execution before cleanup** → If `routes/users.js` is not updated in the same PR, `authenticate` runs twice on `POST /api/users`. This is safe (idempotent) but wasteful. Mitigation: include the cleanup in the same task set.
- **Skeleton routes with no handlers yet** → Adding `router.use(requireRole('admin'))` to a router with only stub `501` responses is harmless and future-proof.

## Migration Plan

1. Fix `requireRole` (no externally visible change for existing callers).
2. Register global `authenticate` in `app.js` with health + swagger + login exemptions.
3. Remove redundant `authenticate` from `routes/users.js`.
4. Add `router.use(requireRole('admin'))` to admin-only skeleton routers.
5. Add/extend tests; ensure full suite is green.
6. Deploy — no DB migration, no env var changes, no breaking API contract changes.

Rollback: revert `app.js` and `auth.js`; per-route auth was functional before.
