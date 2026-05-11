# Auth Backend — Task Breakdown

Tasks are organised by **Jira subtask / endpoint**. Each subtask is self-contained and delivers one working, tested, documented endpoint. Complete subtasks in order — each one builds on the previous.

Shared foundation pieces (error classes, route wiring, Swagger setup, central error handler) are included in **SCRUM-AUTH-1** because it is first; later subtasks depend on them already existing.

---

## SCRUM-AUTH-1 · POST /api/users — Admin-Only User Creation

### Foundation (one-time setup, needed by all subsequent subtasks)

**AUTH-1.F1 — Shared error classes**
- Create `src/utils/errors.js`
- Export: `ValidationError`, `ConflictError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `AccountLockedError`, `AccountInactiveError`, `InvalidCredentialsError`
- Each carries `statusCode`, `code` (machine-readable string), `message` (Hebrew string)
- `AccountLockedError` also carries `minutesRemaining: number`

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
  - `swaggerDefinition`: title "Time Watch API", version from `package.json`, server URLs for dev + prod
  - Security scheme: `cookieAuth` (type: `apiKey`, in: `cookie`, name: `token`)
  - Glob pattern pointing at all route files for `@swagger` annotations
- Mount `GET /api-docs` in `app.js` using `swaggerUi.serve` + `swaggerUi.setup(swaggerSpec)`

---

### Implementation

**AUTH-1.1 — Input validation for POST /api/users**
- Create `src/utils/validate.js` (or add to existing)
- Export `validateCreateUser({ full_name, email, password, role })` → `{ valid: boolean, errors: [{field, message}] }`
- Rules (Hebrew error messages):
  - `full_name`: required, string, 1–150 chars
  - `email`: required, RFC-compliant email format
  - `password`: required, min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character
  - `role`: required, must be `'employee'` or `'admin'`

**AUTH-1.2 — Users repository (create + conflict detection)**
- Create `src/repositories/usersRepository.js`
- `findByEmail(email)` → case-insensitive lookup (`LOWER(email)`), returns full row including `password_hash`; excludes soft-deleted rows; returns `null` if not found
- `create({ full_name, email, password_hash, role })` → inserts row, returns new row **without** `password_hash`
- No business logic; pure Knex queries only
- *(Additional methods for other subtasks will be added later)*

**AUTH-1.3 — Users service**
- Create `src/services/usersService.js`
- `createUser({ full_name, email, password, role })`:
  - Hash `password` with `bcrypt.hash(password, 12)` (cost factor 12, never lower)
  - Call `usersRepository.create({ full_name, email, password_hash, role })`
  - If Knex throws a unique-constraint violation (PostgreSQL error code `23505`) → throw `ConflictError`

**AUTH-1.4 — `authenticate` middleware**
- Create `src/middleware/authenticate.js`
- Read `req.cookies.token`; if missing → `apiError(res, 401, 'UNAUTHENTICATED', 'נדרשת התחברות')`
- Call `jwt.verifyToken(token)` (JWT utility will be built in SCRUM-AUTH-2; stub a minimal version here that only calls `jsonwebtoken.verify` directly)
- `JsonWebTokenError` / `TokenExpiredError` → `apiError(res, 401, 'UNAUTHENTICATED', 'נדרשת התחברות')`
- On success: attach `{ id: payload.sub, role: payload.role }` to `req.user`, call `next()`

**AUTH-1.5 — `requireAdmin` middleware**
- Create `src/middleware/requireAdmin.js`
- Assumes `authenticate` already ran (`req.user` exists)
- `req.user.role !== 'admin'` → `apiError(res, 403, 'FORBIDDEN', 'גישה מותרת למנהלים בלבד')`
- Otherwise call `next()`

**AUTH-1.6 — Users controller**
- Create `src/controllers/usersController.js`
- `create(req, res, next)`:
  1. Call `validateCreateUser(req.body)` → if invalid, call `next(new ValidationError(...))` with the `details` array
  2. Call `usersService.createUser(req.body)` → catch and forward to `next(err)`
  3. Return `201` with the created user object (no `password_hash`)

**AUTH-1.7 — Route: POST /api/users**
- Update `src/routes/users.js`:
  - `POST /` → `[authenticate, requireAdmin, usersController.create]`
  - Stub `GET /`, `PUT /:id`, `PATCH /:id/deactivate` with `501 Not Implemented` for now

**AUTH-1.8 — Swagger annotation: POST /api/users**
- Add `@swagger` JSDoc block to `src/routes/users.js`
- Document:
  - Request body schema (full_name, email, password, role) with descriptions
  - `201` response: user profile shape (id, full_name, email, role, is_active, created_at)
  - `400` response with `details` array
  - `401` (not authenticated)
  - `403` (not admin)
  - `409` (email conflict)
- Apply `cookieAuth` security to this endpoint

---

### Tests

**AUTH-1.T1 — Repository unit tests** (`src/__tests__/usersRepository.test.js`)
- `findByEmail` returns row with `password_hash` for existing user
- `findByEmail` is case-insensitive
- `findByEmail` returns `null` for a soft-deleted user
- `create` inserts and returns row without `password_hash`
- `create` throws (pg code `23505`) on duplicate email

**AUTH-1.T2 — Integration tests: POST /api/users** (`src/__tests__/users.routes.test.js`)
- `201` — valid admin request returns user profile (no `password_hash`)
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

---

## SCRUM-AUTH-2 · POST /api/auth/login — Login with Account Lockout

*Depends on: SCRUM-AUTH-1 (foundation, usersRepository, authenticate middleware, error classes)*

**AUTH-2.1 — JWT utility module**
- Create `src/utils/jwt.js`
- `signToken(payload)` → `jsonwebtoken.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN || '8h' })`
- `verifyToken(token)` → `jsonwebtoken.verify(token, JWT_SECRET)` — throws `TokenExpiredError` or `JsonWebTokenError` on failure
- At module load in production: if `JWT_SECRET` is absent or `< 32` chars → `throw new Error` (fail fast)
- Update `authenticate` middleware (AUTH-1.4) to use `jwt.verifyToken` instead of the inline stub

**AUTH-2.2 — Input validation for POST /api/auth/login**
- Add to `src/utils/validate.js`
- Export `validateLogin({ email, password })` → `{ valid, errors }`
- Rules: `email` required + valid format; `password` required + non-empty

**AUTH-2.3 — Users repository — lockout methods**
- Add to `src/repositories/usersRepository.js`:
  - `incrementFailedAttempts(id)` → atomic `UPDATE users SET failed_attempts = failed_attempts + 1, locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END WHERE id = ?` — returns updated row
  - `resetLockout(id)` → `UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?`

**AUTH-2.4 — Auth service — login with lockout**
- Create `src/services/authService.js`
- `login({ email, password })`:
  1. `usersRepository.findByEmail(email)` — if not found, still run `bcrypt.compare(password, DUMMY_HASH)` for constant-time, then throw `InvalidCredentialsError`
  2. If `!user.is_active` → throw `AccountInactiveError`
  3. If `user.locked_until && user.locked_until > new Date()` → compute minutes remaining, throw `AccountLockedError({ minutesRemaining })`
  4. `bcrypt.compare(password, user.password_hash)`:
     - Mismatch → `usersRepository.incrementFailedAttempts(user.id)` → throw `InvalidCredentialsError`
     - Match → `usersRepository.resetLockout(user.id)` → `jwt.signToken({ sub: user.id, role: user.role })` → return `{ token, user: safeUser }`
  - `safeUser` omits `password_hash`, `failed_attempts`, `locked_until`

**AUTH-2.5 — Auth controller — login handler**
- Create `src/controllers/authController.js`
- `login(req, res, next)`:
  1. `validateLogin(req.body)` → on failure `next(new ValidationError(...))`
  2. `authService.login({ email, password })` → catch and `next(err)`
  3. Set cookie: `res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 })`
  4. Return `200` with user profile (id, full_name, email, role)

**AUTH-2.6 — Route: POST /api/auth/login**
- Update `src/routes/auth.js`:
  - `POST /login` → `[authController.login]`

**AUTH-2.7 — Swagger annotation: POST /api/auth/login**
- Request body: email + password
- `200` response: user profile + `Set-Cookie` header noted in description
- `400` (validation), `401` (`INVALID_CREDENTIALS`), `403` (`ACCOUNT_INACTIVE`), `423` (`ACCOUNT_LOCKED` with minutes remaining)

---

### Tests

**AUTH-2.T1 — Repository unit tests — lockout methods** (add to `usersRepository.test.js`)
- `incrementFailedAttempts` increments counter
- `incrementFailedAttempts` sets `locked_until` when counter reaches 5
- `resetLockout` zeroes `failed_attempts`, nulls `locked_until`, sets `last_login_at`

**AUTH-2.T2 — Service unit tests** (`src/__tests__/authService.test.js`)
- Login success: returns `{ token, user }` with no sensitive fields
- Wrong password: throws `InvalidCredentialsError`
- Unknown email: throws `InvalidCredentialsError` (same error — no enumeration)
- Account locked: throws `AccountLockedError` with `minutesRemaining`
- Inactive account: throws `AccountInactiveError`
- 5th failed attempt triggers `locked_until` being set

**AUTH-2.T3 — Integration tests: POST /api/auth/login** (add to `auth.routes.test.js`)
- `200` + `Set-Cookie: token=...` on valid credentials
- `400` — missing email
- `400` — missing password
- `400` — invalid email format
- `401` — wrong password (generic message, no field hint)
- `423` — locked account (message includes minutes remaining)
- `403` — inactive account

---

## SCRUM-AUTH-3 · POST /api/auth/logout

*Depends on: SCRUM-AUTH-2 (jwt utility, authenticate middleware fully wired)*

**AUTH-3.1 — Auth controller — logout handler**
- Add to `src/controllers/authController.js`
- `logout(req, res)`:
  - `res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: NODE_ENV === 'production' })`
  - Return `204 No Content`

**AUTH-3.2 — Route: POST /api/auth/logout**
- Update `src/routes/auth.js`:
  - `POST /logout` → `[authenticate, authController.logout]`

**AUTH-3.3 — Swagger annotation: POST /api/auth/logout**
- Security: `cookieAuth`
- `204` (success), `401` (not authenticated)

---

### Tests

**AUTH-3.T1 — Integration tests: POST /api/auth/logout** (add to `auth.routes.test.js`)
- `204` + cookie cleared (`Set-Cookie: token=; Expires=...`) when authenticated
- `401` when no cookie present
- `401` when cookie is invalid/tampered

---

## SCRUM-AUTH-4 · GET /api/auth/me

*Depends on: SCRUM-AUTH-2 (jwt utility, authenticate middleware, auth service skeleton)*

**AUTH-4.1 — Users repository — findById**
- Add to `src/repositories/usersRepository.js`:
  - `findById(id)` → returns row **excluding** `password_hash`, `failed_attempts`, `locked_until`; excludes soft-deleted rows; returns `null` if not found

**AUTH-4.2 — Auth service — getMe**
- Add to `src/services/authService.js`
- `getMe(userId)`:
  - `usersRepository.findById(userId)` → if `null`, throw `NotFoundError`
  - Return user row

**AUTH-4.3 — Auth controller — me handler**
- Add to `src/controllers/authController.js`
- `me(req, res, next)`:
  1. `authService.getMe(req.user.id)` → catch and `next(err)`
  2. Return `200` with user profile (id, full_name, email, role, is_active, last_login_at)

**AUTH-4.4 — Route: GET /api/auth/me**
- Update `src/routes/auth.js`:
  - `GET /me` → `[authenticate, authController.me]`

**AUTH-4.5 — Swagger annotation: GET /api/auth/me**
- Security: `cookieAuth`
- `200` response: full user profile schema
- `401` (not authenticated / expired token)

---

### Tests

**AUTH-4.T1 — Integration tests: GET /api/auth/me** (add to `auth.routes.test.js`)
- `200` with user profile when authenticated (no `password_hash` in response)
- `401` when no cookie
- `401` when cookie has invalid/tampered token
- `401` when token is expired

---

## Subtask Summary

| Jira Subtask | Endpoint | Key deliverables |
|---|---|---|
| SCRUM-AUTH-1 | `POST /api/users` | Shared foundation + bcrypt user creation + admin guard |
| SCRUM-AUTH-2 | `POST /api/auth/login` | JWT, lockout logic, cookie issuance |
| SCRUM-AUTH-3 | `POST /api/auth/logout` | Cookie clearing |
| SCRUM-AUTH-4 | `GET /api/auth/me` | Token → user profile lookup |

**Implementation order within each subtask:** Foundation → Repository → Service → Middleware → Controller → Route → Tests → Swagger
