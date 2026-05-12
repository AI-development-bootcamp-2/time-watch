# Authentication Backend — Spec

**Story:** As a system, I want secure login with account lockout so that user accounts are protected against brute-force attacks.

**Branch:** `feature/frontend-auth`  
**Scope:** Backend only (routes, controllers, services, repositories, middleware, Swagger, tests)

---

## 1. Endpoints in Scope

| Method | Path | Role Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/users` | Admin | Create a new user account |
| POST | `/api/auth/login` | Public | Authenticate and issue session cookie |
| POST | `/api/auth/logout` | Authenticated | Clear session cookie |
| GET | `/api/auth/me` | Authenticated | Return current user profile |

---

## 2. Session / Authentication Architecture

### Token Strategy: JWT in HttpOnly Cookie

- On successful login the server signs a JWT and sets it as an **HttpOnly, SameSite=Strict** cookie named `token`.
- The cookie is never readable by JavaScript, eliminating XSS-based token theft.
- The frontend sends `credentials: 'include'` on every request; the browser attaches the cookie automatically.
- No `Authorization: Bearer` header is used; no token is returned in the response body.
- Logout clears the cookie server-side.

### JWT Payload

```json
{
  "sub": "<user uuid>",
  "role": "employee | admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Cookie Settings

| Setting | Development | Production |
|---------|-------------|------------|
| `httpOnly` | `true` | `true` |
| `secure` | `false` | `true` |
| `sameSite` | `'strict'` | `'strict'` |
| `maxAge` | 8 hours (ms) | 8 hours (ms) |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Signing secret — min 32 random bytes in production |
| `JWT_EXPIRES_IN` | Token lifetime, default `8h` |
| `NODE_ENV` | Controls `secure` flag on cookie |

---

## 3. Password Security

- All passwords hashed with **bcrypt**, cost factor **12**.
- Plain-text password is never logged, stored, or returned.
- Admin sets initial password when creating a user (no self-registration).
- Password must satisfy: min 8 chars, ≥1 uppercase letter, ≥1 lowercase letter, ≥1 digit, ≥1 special character (`!@#$%^&*` etc.).
- Hash is stored in `users.password_hash`.

---

## 4. Account Lockout Flow

Uses existing DB columns: `failed_attempts INTEGER DEFAULT 0`, `locked_until TIMESTAMPTZ NULL`.

### Login Sequence

```
1. Look up user by email (case-insensitive).
2. If user not found → generic error (do not reveal existence).
3. If locked_until IS NOT NULL AND locked_until > NOW() → return 423 Locked.
4. Compare submitted password with password_hash via bcrypt.compare().
5. If mismatch:
     a. INCREMENT failed_attempts.
     b. If failed_attempts >= MAX_FAILED_ATTEMPTS (5):
          SET locked_until = NOW() + LOCKOUT_DURATION (15 min).
     c. Return 401 Unauthorized (generic message — no lockout hint until threshold).
6. If match:
     a. RESET failed_attempts = 0, SET locked_until = NULL.
     b. SET last_login_at = NOW().
     c. Sign JWT, set cookie, return 200 with user profile.
```

### Constants

| Constant | Value |
|----------|-------|
| `MAX_FAILED_ATTEMPTS` | 5 |
| `LOCKOUT_DURATION` | 15 minutes |

### Error Responses

| Scenario | HTTP Status | `code` field | Message |
|----------|-------------|--------------|---------|
| Wrong email or password | 401 | `INVALID_CREDENTIALS` | "אימייל או סיסמה שגויים" |
| Account locked | 423 | `ACCOUNT_LOCKED` | "החשבון נעול זמנית. נסה שוב בעוד X דקות." |
| Account inactive | 403 | `ACCOUNT_INACTIVE` | "החשבון אינו פעיל" |

---

## 5. Endpoint Contracts

### POST /api/users

**Auth:** Admin JWT cookie required.

**Request body:**
```json
{
  "full_name": "ישראל ישראלי",
  "email": "israel@example.com",
  "password": "Temp1234!",
  "role": "employee"
}
```

**Validation:**
- `full_name`: required, string, 1–150 chars
- `email`: required, valid email format, unique (case-insensitive)
- `password`: required, min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character
- `role`: required, one of `employee`, `admin`

**Success — 201 Created:**
```json
{
  "id": "uuid",
  "full_name": "ישראל ישראלי",
  "email": "israel@example.com",
  "role": "employee",
  "is_active": true,
  "created_at": "2026-05-11T10:00:00.000Z"
}
```

**Errors:**
- `400` — validation failure
- `401` — not authenticated
- `403` — not admin
- `409` — email already exists

---

### POST /api/auth/login

**Auth:** Public.

**Request body:**
```json
{
  "email": "israel@example.com",
  "password": "Temp1234!"
}
```

**Validation:**
- `email`: required, valid email format
- `password`: required, non-empty string

**Success — 200 OK** (sets `token` cookie):
```json
{
  "id": "uuid",
  "full_name": "ישראל ישראלי",
  "email": "israel@example.com",
  "role": "employee"
}
```

**Errors:** See Section 4 error table.

---

### POST /api/auth/logout

**Auth:** Authenticated (valid JWT cookie).

**Request body:** empty.

**Success — 204 No Content** — clears `token` cookie.

**Errors:**
- `401` — not authenticated (no or invalid cookie)

---

### GET /api/auth/me

**Auth:** Authenticated (valid JWT cookie).

**Success — 200 OK:**
```json
{
  "id": "uuid",
  "full_name": "ישראל ישראלי",
  "email": "israel@example.com",
  "role": "employee",
  "is_active": true,
  "last_login_at": "2026-05-11T09:00:00.000Z"
}
```

**Errors:**
- `401` — missing/expired/invalid cookie

---

## 6. Auth Middleware

### `authenticate` Middleware

- Reads `token` cookie.
- Verifies JWT signature and expiry using `jsonwebtoken.verify()`.
- On failure: returns `401 { code: 'UNAUTHENTICATED', message: '...' }`.
- On success: attaches `{ id, role }` to `req.user` and calls `next()`.

### `requireAdmin` Middleware (composed after `authenticate`)

- Checks `req.user.role === 'admin'`.
- On failure: returns `403 { code: 'FORBIDDEN', message: '...' }`.

### Usage

```
POST /api/users        → [authenticate, requireAdmin, usersController.create]
POST /api/auth/login   → [authController.login]
POST /api/auth/logout  → [authenticate, authController.logout]
GET  /api/auth/me      → [authenticate, authController.me]
```

---

## 7. Layered Architecture

```
routes/         register route + middleware chain
controllers/    parse req → call service → format res
services/       business logic (lockout, password check, JWT)
repositories/   DB queries via Knex (no business logic)
```

### Key Modules

| File | Responsibility |
|------|---------------|
| `middleware/authenticate.js` | JWT cookie verification |
| `middleware/requireAdmin.js` | Role guard |
| `controllers/authController.js` | login, logout, me handlers |
| `controllers/usersController.js` | create user handler |
| `services/authService.js` | login flow, lockout logic, token signing |
| `services/usersService.js` | user creation, password hashing |
| `repositories/usersRepository.js` | DB queries for users table |
| `utils/jwt.js` | sign / verify helpers |
| `utils/validate.js` | input validation helpers |

---

## 8. Error Response Shape

All errors follow a consistent envelope:

```json
{
  "code": "MACHINE_READABLE_CODE",
  "message": "Human-readable message in Hebrew"
}
```

Validation errors include a `details` array:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "שגיאת קלט",
  "details": [
    { "field": "email", "message": "אימייל לא תקין" }
  ]
}
```

---

## 9. Swagger / OpenAPI Documentation

- All four endpoints documented with request body schema, response schemas (success + all error cases), and security scheme.
- Security scheme: `cookieAuth` (type: `apiKey`, in: `cookie`, name: `token`).
- Swagger available at `GET /api-docs`.
- JSDoc `@swagger` annotations on each route file; `swagger-jsdoc` + `swagger-ui-express` generate the UI.

---

## 10. Security Considerations

- Generic error messages for login failures (do not reveal which field is wrong).
- bcrypt comparison always runs even if user not found (constant-time response to prevent timing attacks on email enumeration).
- Cookies are `HttpOnly` and `SameSite=Strict`.
- JWT secret validated at startup: process exits if `JWT_SECRET` is absent or shorter than 32 characters in production.
- No sensitive fields (`password_hash`, `failed_attempts`, `locked_until`) are ever returned in API responses.
- Email lookup is always case-insensitive (uses existing `LOWER(email)` index).
