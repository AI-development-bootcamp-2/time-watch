# Auth Backend — Task Breakdown

Tasks are organised by **Jira subtask / endpoint**, added one at a time. Each subtask delivers one working, tested, documented endpoint.

---

## SCRUM-AUTH-1 · POST /api/users — Admin-Only User Creation

### Shared Foundation
*(One-time setup. Required by this endpoint; subsequent subtasks will build on top.)*

**AUTH-1.F1 — Shared error classes**
- Create `src/utils/errors.js`
- Export: `ValidationError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`
- Each carries `statusCode`, `code` (machine-readable string), `message` (Hebrew string)

**AUTH-1.F2 — Error response helper**
- Create `src/utils/apiError.js`
- Export `apiError(res, status, code, message, details?)` — sends the standard JSON error envelope (spec Section 8)
- Use everywhere instead of inline `res.status().json()`

**AUTH-1.F3 — Central error handler middleware**
- Create `src/middleware/errorHandler.js`
- Express 4-arg handler `(err, req, res, next)`
- Instances of known error classes from `errors.js` → use their `statusCode`, `code`, `message`
- Anything else → log full error, return `500 { code: 'INTERNAL_ERROR', message: 'שגיאת שרת' }`

**AUTH-1.F4 — Wire routes + error handler into Express app**
- In `src/app.js`: mount `src/routes/auth.js` at `/api/auth` and `src/routes/users.js` at `/api/users`
- Mount `errorHandler` as the last middleware (after all routes)
- Confirm `GET /api/health` still returns 200

**AUTH-1.F5 — Install and configure Swagger**
- `npm install swagger-jsdoc swagger-ui-express` in `backend/`
- Create `src/config/swagger.js`:
  - `swaggerDefinition`: title "Time Watch API", version from `package.json`, server URL for dev
  - Security scheme: `cookieAuth` (type: `apiKey`, in: `cookie`, name: `token`)
  - Glob pattern pointing at route files for `@swagger` annotations
- Mount `GET /api-docs` in `app.js`

---

### Implementation

**AUTH-1.1 — Input validation**
- Create `src/utils/validate.js`
- Export `validateCreateUser({ full_name, email, password, role })` → `{ valid: boolean, errors: [{ field, message }] }`
- Rules (Hebrew error messages):
  - `full_name`: required, string, 1–150 chars
  - `email`: required, RFC-compliant email format
  - `password`: required, min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character
  - `role`: required, must be `'employee'` or `'admin'`

**AUTH-1.2 — Users repository**
- Create `src/repositories/usersRepository.js`
- `findByEmail(email)` → case-insensitive lookup (`LOWER(email)`), returns full row including `password_hash`; excludes soft-deleted rows; returns `null` if not found
- `create({ full_name, email, password_hash, role })` → inserts row, returns new row **without** `password_hash`
- Pure Knex queries only — no business logic

**AUTH-1.3 — Users service**
- Create `src/services/usersService.js`
- `createUser({ full_name, email, password, role })`:
  - Hash password with `bcrypt.hash(password, 12)` — cost factor must be 12, never lower
  - Call `usersRepository.create({ full_name, email, password_hash, role })`
  - If Knex throws a unique-constraint violation (PostgreSQL error code `23505`) → throw `ConflictError`

**AUTH-1.4 — `authenticate` middleware**
- Create `src/middleware/authenticate.js`
- Read `req.cookies.token`; if missing → `apiError(res, 401, 'UNAUTHENTICATED', 'נדרשת התחברות')`
- Verify with `jsonwebtoken.verify(token, process.env.JWT_SECRET)` directly (full jwt utility module is part of the login subtask)
- `JsonWebTokenError` / `TokenExpiredError` → `apiError(res, 401, 'UNAUTHENTICATED', 'נדרשת התחברות')`
- On success: attach `{ id: payload.sub, role: payload.role }` to `req.user`, call `next()`

**AUTH-1.5 — `requireAdmin` middleware**
- Create `src/middleware/requireAdmin.js`
- Assumes `authenticate` already ran (`req.user` is set)
- `req.user.role !== 'admin'` → `apiError(res, 403, 'FORBIDDEN', 'גישה מותרת למנהלים בלבד')`
- Otherwise call `next()`

**AUTH-1.6 — Users controller**
- Create `src/controllers/usersController.js`
- `create(req, res, next)`:
  1. Call `validateCreateUser(req.body)` → if invalid, `next(new ValidationError(...))` with the `details` array
  2. Call `usersService.createUser(req.body)` → catch and `next(err)`
  3. Return `201` with the created user object (no `password_hash`)

**AUTH-1.7 — Route: POST /api/users**
- Update `src/routes/users.js`:
  - `POST /` → `[authenticate, requireAdmin, usersController.create]`
  - Stub `GET /`, `PUT /:id`, `PATCH /:id/deactivate` with `501 Not Implemented`

**AUTH-1.8 — Swagger annotation: POST /api/users**
- Add `@swagger` JSDoc block to `src/routes/users.js`
- Document:
  - Request body schema: `full_name`, `email`, `password`, `role` — with field descriptions
  - `201` response: user profile shape (`id`, `full_name`, `email`, `role`, `is_active`, `created_at`)
  - `400` with `details` array (validation errors)
  - `401` not authenticated
  - `403` not admin
  - `409` email already exists
- Apply `cookieAuth` security to this endpoint

---

### Tests

All tests use Jest + Supertest against the real test DB (`NODE_ENV=test`).

**AUTH-1.T1 — Repository unit tests** (`src/__tests__/usersRepository.test.js`)
- `findByEmail` returns row including `password_hash` for an existing user
- `findByEmail` is case-insensitive
- `findByEmail` returns `null` for a soft-deleted user
- `create` inserts and returns row without `password_hash`
- `create` throws (pg code `23505`) on duplicate email

**AUTH-1.T2 — Integration tests: POST /api/users** (`src/__tests__/users.routes.test.js`)
- `201` — valid admin request returns user profile without `password_hash`
- `400` — missing `full_name`
- `400` — missing `email`
- `400` — invalid email format
- `400` — password too short (< 8 chars)
- `400` — password missing uppercase
- `400` — password missing lowercase
- `400` — password missing digit
- `400` — password missing special character
- `400` — invalid `role` value
- `401` — no auth cookie
- `403` — authenticated as employee (non-admin)
- `409` — duplicate email
