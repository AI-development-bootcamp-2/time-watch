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

---

## SCRUM-AUTH-2 · POST /api/auth/login — Login with Account Lockout

*Depends on: SCRUM-AUTH-1 (error classes, usersRepository.findByEmail, errorHandler, app wiring)*

**Constants for this subtask:**

| Constant | Value |
|---|---|
| `MAX_FAILED_ATTEMPTS` | **3** |
| `LOCKOUT_DURATION` | 15 minutes |

---

### Implementation

**AUTH-2.1 — Add missing error classes**
- Add to `src/utils/errors.js`:
  - `InvalidCredentialsError` — `statusCode: 401`, `code: 'INVALID_CREDENTIALS'`, `message: 'אימייל או סיסמה שגויים'`
  - `AccountLockedError` — `statusCode: 423`, `code: 'ACCOUNT_LOCKED'`; carries `minutesRemaining: number`; `message` is dynamic: `'החשבון נעול זמנית. נסה שוב בעוד X דקות.'`

**AUTH-2.2 — JWT utility module**
- Create `src/utils/jwt.js`
- `signToken(payload)` → `jsonwebtoken.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN || '8h' })`
- `verifyToken(token)` → `jsonwebtoken.verify(token, JWT_SECRET)` — propagates `TokenExpiredError` / `JsonWebTokenError`
- Update `authenticate` middleware to call `jwt.verifyToken` instead of the inline `jsonwebtoken.verify` call
  - Note: `app.js` currently imports `authenticate` from `./middleware/auth` — reconcile the file path before updating

**AUTH-2.3 — Login input validation**
- Add to `src/utils/validate.js`:
- Export `validateLogin({ email, password })` → `{ valid: boolean, errors: [{ field, message }] }`
- Rules: `email` required + valid format; `password` required + non-empty string
  - *(No complexity rules here — login accepts whatever the user types)*

**AUTH-2.4 — Repository: lockout methods**
- Add to `src/repositories/usersRepository.js`:
  - `incrementFailedAttempts(id)`:
    - Atomically increments `failed_attempts`
    - If the new value reaches `MAX_FAILED_ATTEMPTS` (3), simultaneously set `locked_until = NOW() + INTERVAL '15 minutes'`
    - Use a single `UPDATE ... RETURNING` so the increment and lock are one DB round-trip
  - `resetLockout(id)`:
    - Sets `failed_attempts = 0`, `locked_until = NULL`, `last_login_at = NOW()`

**AUTH-2.5 — Auth service: login**
- Create `src/services/authService.js`
- Export `login({ email, password })`:
  1. `usersRepository.findByEmail(email)` — store result; **always** call `bcrypt.compare` (using a dummy hash if user not found) to prevent timing-based email enumeration
  2. If user not found → throw `InvalidCredentialsError` *(after bcrypt runs)*
  3. If `user.locked_until && user.locked_until > new Date()` → compute `minutesRemaining`, throw `AccountLockedError`
  4. `bcrypt.compare(password, user.password_hash)`:
     - Mismatch → `usersRepository.incrementFailedAttempts(user.id)` → throw `InvalidCredentialsError`
     - Match → `usersRepository.resetLockout(user.id)` → sign token → return `{ token, user: safeUser }`
  - `safeUser` omits `password_hash`, `failed_attempts`, `locked_until`
  - Sign token with `jwt.signToken({ sub: user.id, role: user.role })`

**AUTH-2.6 — Auth controller: login handler**
- Create `src/controllers/authController.js`
- `login(req, res, next)`:
  1. `validateLogin(req.body)` → on failure `next(new ValidationError(...))`
  2. `authService.login({ email, password })` → catch and `next(err)`
  3. On success: set cookie and return `200` with safe user profile
  - Cookie settings: `httpOnly: true`, `sameSite: 'strict'`, `secure: NODE_ENV === 'production'`, `maxAge: 8 * 60 * 60 * 1000`
  - Response body: `{ id, full_name, email, role }` — no token in body

**AUTH-2.7 — Route: POST /api/auth/login**
- Update `src/routes/auth.js`:
  - `POST /login` → `[authController.login]` (public — no `authenticate` middleware)
  - Leave `POST /logout` and `GET /me` as stubs returning `501`

**AUTH-2.8 — Swagger annotation: POST /api/auth/login**
- Add `@swagger` JSDoc block to `src/routes/auth.js`
- Document:
  - Request body: `email` (string, email format) + `password` (string)
  - `200` response: user profile (`id`, `full_name`, `email`, `role`) + note that `Set-Cookie: token=...` is set
  - `400` (`VALIDATION_ERROR`) — missing or malformed fields
  - `401` (`INVALID_CREDENTIALS`) — wrong email or password (same message for both)
  - `423` (`ACCOUNT_LOCKED`) — account locked, message includes minutes remaining

---

### Tests

**AUTH-2.T1 — Repository unit tests** (add to `src/__tests__/usersRepository.test.js`)
- `incrementFailedAttempts` increments `failed_attempts` counter by 1
- 3rd failed attempt sets `locked_until` to approximately `NOW() + 15 min`
- 2nd failed attempt does **not** set `locked_until`
- `resetLockout` sets `failed_attempts = 0`, `locked_until = NULL`, `last_login_at` to a recent timestamp

**AUTH-2.T2 — Service unit tests** (`src/__tests__/authService.test.js`)
- Successful login returns `{ token, user }` with no sensitive fields in `user`
- Wrong password throws `InvalidCredentialsError`
- Unknown email throws `InvalidCredentialsError` (same error class — no enumeration)
- Locked account throws `AccountLockedError` with a `minutesRemaining` value
- 3rd failed attempt causes `locked_until` to be set (integration with repository)
- Successful login resets `failed_attempts` to `0`

**AUTH-2.T3 — Integration tests: POST /api/auth/login** (`src/__tests__/auth.routes.test.js`)
- `200` — valid credentials, `Set-Cookie` header contains `token=`, body has user profile without `password_hash`
- `400` — missing `email`
- `400` — missing `password`
- `400` — invalid email format
- `401` — wrong password (generic message, same as unknown email)
- `401` — unknown email (same `401` and same message as wrong password)
- `423` — account locked after 3 failed attempts; response message includes minutes remaining
