# EPIC-2 — User Login Logic
## Jira Planning Breakdown

> **Source of truth:** `openspec/changes/time-watch-full-system/tasks.md` — Epic 2
> **Date drafted:** 2026-05-10
> **Status:** Ready for sprint planning

---

## Epic Summary

| Field | Value |
|---|---|
| **Epic ID** | EP-2 |
| **Epic Title** | User Login Logic |
| **Priority** | Critical — blocks all other epics |
| **Components** | `backend`, `frontend`, `middleware`, `security` |
| **Labels** | `authentication`, `jwt`, `rbac`, `security`, `hebrew-ui` |
| **Blocks** | EP-3 (Admin CRUD), EP-4 (Time Reporting), EP-5 (Absences) |
| **Depends on** | EP-1 (Setup & Infrastructure, DB schema with `users` table) |

**Goal:** Implement end-to-end authentication — secure backend endpoints, JWT middleware, role-based access control, and a Hebrew RTL login UI — so that only authenticated and authorized users can access any part of the system.

---

---

# Story 2.1 — Backend Authentication

**Story ID:** EP2-S1
**Title:** Backend Authentication Endpoints

### User Story
> As a system, I want secure login with account lockout so that user accounts are protected against brute-force attacks.

### Technical Overview
- Four REST endpoints: user creation, login, logout, and session restore
- Passwords hashed with **bcrypt** (min cost factor 10) — never stored in plaintext
- Successful login issues a **JWT** stored in an **httpOnly, SameSite=Strict** cookie
- Failed logins increment a `failed_attempts` counter in the database
- Account is blocked after **3 failed attempts** — returns `423 Locked`
- All endpoints documented in Swagger at `/api-docs`

---

## Task 2.1.1 — User Creation Endpoint (Admin-Only)

**Endpoint:** `POST /api/users`
**Type:** Backend + Security + Testing

### Subtasks

#### Backend
- [ ] Define and validate request schema: `{ name, email, password, role }`
- [ ] Enforce password complexity: ≥8 characters, at least one uppercase letter, one lowercase letter, one digit, one special character — return `400` with a descriptive message on failure
- [ ] Hash the password using **bcrypt** with cost factor ≥10 before inserting into the database
- [ ] Check email uniqueness — return `409 Conflict` if already registered
- [ ] Insert user record with `is_active = true`, `failed_attempts = 0`
- [ ] Return `201 Created` with the new user object — **exclude password hash from response**

#### Security
- [ ] Apply `authenticate` middleware (EP2-T5) to this route
- [ ] Apply `requireRole('admin')` guard (EP2-T6) — return `403 Forbidden` for non-admin callers
- [ ] Ensure JWT secret is loaded from environment variable, never hardcoded
- [ ] Ensure password hash never appears in logs or API responses

#### Testing
- [ ] Integration test: admin creates user → `201`, password stored as hash
- [ ] Integration test: regular user calls endpoint → `403`
- [ ] Integration test: unauthenticated request → `401`
- [ ] Unit test: password complexity validation — each rule independently
- [ ] Integration test: duplicate email → `409`
- [ ] Integration test: missing required fields → `400`
- [ ] Verify password hash is not present in response body

### Acceptance Criteria

**Scenario 1 — Happy path**
- **Given** an admin is authenticated
- **When** they send `POST /api/users` with `{ name, email, password (strong), role }`
- **Then** the server responds `201 Created` with the new user object (no `password` field)

**Scenario 2 — Non-admin caller**
- **Given** a regular (non-admin) user is authenticated
- **When** they call `POST /api/users`
- **Then** the server returns `403 Forbidden`

**Scenario 3 — Unauthenticated caller**
- **Given** no valid JWT cookie is present
- **When** the request hits the route
- **Then** the server returns `401 Unauthorized`

**Scenario 4 — Weak password**
- **Given** the submitted password fails any complexity rule
- **When** the server validates the input
- **Then** the server returns `400 Bad Request` with a message identifying which rule failed

**Scenario 5 — Duplicate email**
- **Given** the submitted email already exists in the database
- **When** the server checks uniqueness
- **Then** the server returns `409 Conflict`

### Definition of Done
- [ ] Endpoint implemented and covered in Swagger docs
- [ ] bcrypt hashing confirmed in integration test (stored value != plaintext)
- [ ] 403 path tested with a valid regular-user JWT
- [ ] Password field absent from all API responses and server logs
- [ ] Minimum 80% branch coverage on this module

---

## Task 2.1.2 — Login Endpoint

**Endpoint:** `POST /api/auth/login`
**Type:** Backend + Security + Testing

### Subtasks

#### Backend
- [ ] Validate request body: `{ email, password }` — return `400` on missing fields
- [ ] Look up user by email — return `401` if not found (use the same generic error as wrong password to prevent user enumeration)
- [ ] If `failed_attempts >= 3`, immediately return `423 Locked` without checking the password
- [ ] Compare submitted password against stored bcrypt hash
- [ ] On wrong password: increment `failed_attempts` in the database, return `401 Unauthorized`
- [ ] On correct password: reset `failed_attempts` to 0, issue JWT, set in `httpOnly SameSite=Strict` cookie
- [ ] JWT payload must include: `{ userId, role, iat, exp }` — configure appropriate expiry (e.g., 8 hours)
- [ ] Return `200 OK` with user profile `{ id, name, email, role }` on success

#### Security
- [ ] This route is **excluded** from the global `authenticate` middleware
- [ ] Use the same `401` response body for "user not found" and "wrong password" — no user enumeration
- [ ] JWT secret loaded from environment variable
- [ ] Cookie flags: `httpOnly: true`, `sameSite: 'strict'`, `secure: true` (in production)

#### Testing
- [ ] Integration test: correct credentials → `200`, JWT cookie set in response headers
- [ ] Integration test: wrong password (1st attempt) → `401`, `failed_attempts = 1`
- [ ] Integration test: wrong password (2nd attempt) → `401`, `failed_attempts = 2`
- [ ] Integration test: wrong password (3rd attempt) → `401`, `failed_attempts = 3`
- [ ] Integration test: any attempt after 3 failures → `423 Locked`
- [ ] Integration test: correct password after 3 failures → `423 Locked` (password not checked)
- [ ] Integration test: unknown email → `401` (same response as wrong password)
- [ ] Integration test: missing `email` or `password` → `400`
- [ ] Verify JWT cookie is `httpOnly` (not readable via `document.cookie`)
- [ ] Verify `failed_attempts` resets to `0` on successful login

### Acceptance Criteria

**Scenario 1 — Successful login**
- **Given** a user exists and is not locked
- **When** they submit correct `email` and `password`
- **Then** the server responds `200 OK`, sets an `httpOnly SameSite=Strict` JWT cookie, and returns `{ id, name, email, role }`

**Scenario 2 — Wrong password (under limit)**
- **Given** a user has fewer than 3 failed attempts
- **When** they submit an incorrect password
- **Then** the server returns `401 Unauthorized`, and `failed_attempts` increments by 1

**Scenario 3 — Account locked**
- **Given** a user has `failed_attempts >= 3`
- **When** any login attempt is made (correct or incorrect password)
- **Then** the server returns `423 Locked` without inspecting the password

**Scenario 4 — Unknown email**
- **Given** the submitted email does not exist
- **When** the server processes the login
- **Then** the server returns `401 Unauthorized` — identical response to wrong password

**Scenario 5 — Missing fields**
- **Given** the request body is missing `email` or `password`
- **When** the server validates the request
- **Then** the server returns `400 Bad Request`

### Definition of Done
- [ ] Endpoint implemented and covered in Swagger docs
- [ ] JWT cookie confirmed as `httpOnly` and `SameSite=Strict` in test response headers
- [ ] `failed_attempts` increments correctly confirmed in DB after each failure
- [ ] Account lockout tested at exactly the 3rd attempt
- [ ] No difference in response body between wrong-password and unknown-email scenarios
- [ ] JWT secret never appears in source code — loaded from `process.env`

---

## Task 2.1.3 — Logout Endpoint

**Endpoint:** `POST /api/auth/logout`
**Type:** Backend + Testing

### Subtasks

#### Backend
- [ ] Clear the JWT cookie by setting `maxAge: 0` (or `expires` in the past) in the `Set-Cookie` response header
- [ ] Return `200 OK` with a confirmation message
- [ ] Endpoint should be idempotent — calling it without a cookie still returns `200`

#### Testing
- [ ] Integration test: authenticated user logs out → `200`, cookie cleared in response headers
- [ ] Integration test: unauthenticated user calls logout → `200` (no error)
- [ ] Integration test: subsequent request after logout → `401 Unauthorized`

### Acceptance Criteria

**Scenario 1 — Authenticated logout**
- **Given** a user has a valid JWT cookie
- **When** they call `POST /api/auth/logout`
- **Then** the server responds `200 OK` and the JWT cookie is cleared

**Scenario 2 — Idempotent logout**
- **Given** no JWT cookie is present
- **When** `POST /api/auth/logout` is called
- **Then** the server still returns `200 OK` (no error for already-logged-out state)

**Scenario 3 — Post-logout access**
- **Given** a user has logged out
- **When** they make any protected request
- **Then** the server returns `401 Unauthorized`

### Definition of Done
- [ ] Endpoint implemented and covered in Swagger docs
- [ ] Cookie cleared confirmed in `Set-Cookie` response header
- [ ] Post-logout `401` confirmed in integration test

---

## Task 2.1.4 — Current User Endpoint

**Endpoint:** `GET /api/auth/me`
**Type:** Backend + Testing

### Subtasks

#### Backend
- [ ] Apply `authenticate` middleware — this route is protected
- [ ] Return `{ id, name, email, role }` from `req.user` (populated by the middleware)
- [ ] Return `401` if JWT is missing or expired (handled by middleware)

#### Testing
- [ ] Integration test: valid JWT → `200` with user profile
- [ ] Integration test: no cookie → `401`
- [ ] Integration test: expired JWT → `401`
- [ ] Verify password hash and `failed_attempts` are never returned

### Acceptance Criteria

**Scenario 1 — Authenticated session**
- **Given** a valid JWT cookie is present
- **When** `GET /api/auth/me` is called
- **Then** the server returns `200 OK` with `{ id, name, email, role }`

**Scenario 2 — No cookie**
- **Given** no JWT cookie is present
- **When** `GET /api/auth/me` is called
- **Then** the server returns `401 Unauthorized`

**Scenario 3 — Expired token**
- **Given** the JWT cookie contains an expired token
- **When** `GET /api/auth/me` is called
- **Then** the server returns `401 Unauthorized`

### Definition of Done
- [ ] Endpoint implemented and covered in Swagger docs
- [ ] Sensitive fields (`password`, `failed_attempts`) absent from response
- [ ] Used by the frontend `AuthContext` on app load to restore session

---

---

# Story 2.2 — Auth Middleware & Route Guards

**Story ID:** EP2-S2
**Title:** JWT Middleware and Role-Based Access Control

### User Story
> As a developer, I want role-based middleware so that every route is protected without repeating logic in each controller.

### Technical Overview
- `authenticate` middleware is registered globally — applied to all routes except `POST /api/auth/login`
- `requireRole(...roles)` is a composable factory applied per-route to enforce RBAC
- Both middlewares must fail clearly and consistently — no silent passes
- Middleware must be tested independently from controllers

---

## Task 2.2.1 — JWT Authenticate Middleware

**Type:** Backend + Security + Testing

### Subtasks

#### Backend
- [ ] Read the JWT from the `httpOnly` cookie on the incoming request
- [ ] Verify the JWT signature and expiry using the signing secret from environment variables
- [ ] On success: decode the payload and attach it as `req.user = { userId, role }`
- [ ] On missing cookie: return `401 Unauthorized`
- [ ] On expired token: return `401 Unauthorized`
- [ ] On invalid/tampered signature: return `401 Unauthorized`
- [ ] Register the middleware globally in `app.js` / router — **exempt only** `POST /api/auth/login`

#### Security
- [ ] JWT secret must be loaded from `process.env.JWT_SECRET` — never hardcoded
- [ ] Do not leak the reason for rejection in the error response body (avoid "token expired" vs "token missing" distinction in the client response)

#### Testing
- [ ] Unit test: valid JWT → middleware calls `next()` and `req.user` is populated
- [ ] Unit test: missing cookie → `401`
- [ ] Unit test: expired JWT → `401`
- [ ] Unit test: tampered/invalid signature → `401`
- [ ] Integration test: `POST /api/auth/login` bypasses the middleware
- [ ] Integration test: any other route without a cookie → `401`

### Acceptance Criteria

**Scenario 1 — Valid token**
- **Given** a valid, non-expired JWT cookie is on the request
- **When** the `authenticate` middleware runs
- **Then** `req.user` is populated and `next()` is called

**Scenario 2 — Missing cookie**
- **Given** no cookie is present
- **When** the `authenticate` middleware runs
- **Then** the request is rejected with `401 Unauthorized` before reaching any controller

**Scenario 3 — Expired token**
- **Given** the JWT is expired
- **When** the `authenticate` middleware runs
- **Then** the request is rejected with `401 Unauthorized`

**Scenario 4 — Tampered token**
- **Given** the JWT signature has been modified
- **When** the `authenticate` middleware verifies it
- **Then** the request is rejected with `401 Unauthorized`

**Scenario 5 — Login route exemption**
- **Given** a request to `POST /api/auth/login`
- **When** the middleware chain executes
- **Then** the `authenticate` middleware is skipped entirely for this route

### Definition of Done
- [ ] Middleware registered globally in app startup
- [ ] Login route explicitly excluded from the middleware
- [ ] All four rejection paths covered by unit tests
- [ ] JWT secret loaded from environment variable — no hardcoded strings
- [ ] Middleware is export-ready for use in any router

---

## Task 2.2.2 — Role-Guard Middleware

**Type:** Backend + Security + Testing

### Subtasks

#### Backend
- [ ] Implement `requireRole(...roles)` as a factory function that returns an Express middleware
- [ ] The returned middleware checks `req.user.role` against the `roles` array
- [ ] If `req.user` is undefined (middleware ordering error), return `401 Unauthorized`
- [ ] If `req.user.role` is not in `roles`, return `403 Forbidden`
- [ ] Apply `requireRole('admin')` to `POST /api/users` and all other admin-only routes

#### Security
- [ ] Guard must be applied **after** `authenticate` in the middleware chain — never before
- [ ] Role value is read from the verified JWT payload (`req.user`), not from the request body

#### Testing
- [ ] Unit test: admin token + `requireRole('admin')` → `next()` called
- [ ] Unit test: regular-user token + `requireRole('admin')` → `403`
- [ ] Unit test: `req.user` is undefined → `401`
- [ ] Unit test: composable roles → `requireRole('admin', 'manager')` passes both
- [ ] Integration test: regular user accessing `POST /api/users` → `403`

### Acceptance Criteria

**Scenario 1 — Authorized role**
- **Given** an authenticated user with role `admin` accesses an admin-only route
- **When** `requireRole('admin')` runs
- **Then** the request proceeds to the controller

**Scenario 2 — Unauthorized role**
- **Given** an authenticated user with role `regular` accesses an admin-only route
- **When** `requireRole('admin')` runs
- **Then** the server returns `403 Forbidden`

**Scenario 3 — No user on request**
- **Given** `req.user` is not set (e.g., middleware ordering error)
- **When** `requireRole` executes
- **Then** the server returns `401 Unauthorized` — no crash

**Scenario 4 — Composable roles**
- **Given** a route is protected with `requireRole('admin', 'manager')`
- **When** a user with role `manager` accesses it
- **Then** the request proceeds to the controller

### Definition of Done
- [ ] Factory is composable: `requireRole('admin')`, `requireRole('admin', 'manager')`
- [ ] Applied to all admin routes — verified with integration tests
- [ ] Role read from `req.user` (JWT payload), never from request body
- [ ] Unit tests cover all three branches: authorized, unauthorized, missing user

---

---

# Story 2.3 — Login UI

**Story ID:** EP2-S3
**Title:** Login Page and Auth Context

### User Story
> As an employee, I want a login page in Hebrew so I can authenticate and reach my reporting screen.

### Technical Overview
- React SPA with Hebrew UI (RTL layout, `dir="rtl"` on root)
- Login page at `/login` — the only publicly accessible route
- `AuthContext` calls `GET /api/auth/me` on app load to restore session
- `ProtectedRoute` wrapper redirects unauthenticated users to `/login`
- Role-based routing guards admin-only pages

---

## Task 2.3.1 — Login Page

**Route:** `/login`
**Type:** Frontend + Testing

### Subtasks

#### Frontend
- [ ] Create the `/login` route in the React router configuration
- [ ] Build the login form component with:
  - Email input field — Hebrew label: `דואר אלקטרוני`
  - Password input field — Hebrew label: `סיסמה`
  - Submit button — Hebrew label: `התחבר`
  - All elements laid out RTL (`dir="rtl"`)
- [ ] On submit: call `POST /api/auth/login` with `{ email, password }`
- [ ] Show a loading/disabled state on the submit button while the request is in flight
- [ ] On success (`200`): redirect to home route `/`
- [ ] On wrong credentials (`401`): display inline error in Hebrew — e.g., `אימייל או סיסמה שגויים`
- [ ] On locked account (`423`): display a distinct inline error in Hebrew — e.g., `החשבון נעול. פנה למנהל המערכת`
- [ ] On network error: display a generic error in Hebrew — e.g., `שגיאת שרת. נסה שנית`
- [ ] If user is already authenticated on load, redirect away from `/login` to `/`

#### Testing
- [ ] Component test: form renders with RTL layout and Hebrew labels
- [ ] Component test: submit button is disabled while request is in flight
- [ ] Integration test: successful login → redirects to `/`
- [ ] Integration test: wrong credentials → inline `401` error displayed (Hebrew)
- [ ] Integration test: locked account → inline `423` error displayed (Hebrew, distinct message)
- [ ] Integration test: already authenticated user visiting `/login` → redirected to `/`

### Acceptance Criteria

**Scenario 1 — Successful login**
- **Given** a user is on `/login` and enters correct credentials
- **When** they submit the form
- **Then** they are redirected to `/` and the home screen is displayed

**Scenario 2 — Wrong credentials**
- **Given** a user enters incorrect email or password
- **When** the server returns `401`
- **Then** an inline error message is displayed in Hebrew below the form

**Scenario 3 — Locked account**
- **Given** the user's account is locked (`failed_attempts >= 3`)
- **When** the server returns `423`
- **Then** a distinct Hebrew error message is shown advising the user to contact an administrator

**Scenario 4 — Already authenticated**
- **Given** a user with a valid session visits `/login`
- **When** the page loads
- **Then** they are immediately redirected to `/` without seeing the login form

**Scenario 5 — RTL layout**
- **Given** the login page is rendered
- **When** it appears in the browser
- **Then** all text, labels, and input fields are right-to-left aligned and in Hebrew

### Definition of Done
- [ ] Form renders in Hebrew with RTL layout confirmed visually
- [ ] All three error paths display distinct Hebrew messages
- [ ] Redirect to `/` on success confirmed in integration test
- [ ] No plain-text password ever sent or logged beyond the `POST /api/auth/login` request body
- [ ] Loading state prevents duplicate form submissions

---

## Task 2.3.2 — Auth Context & Protected Routes

**Type:** Frontend + Testing

### Subtasks

#### Frontend
- [ ] Create `AuthContext` with React Context API — shape: `{ user, isLoading, login, logout }`
- [ ] On app load: call `GET /api/auth/me` to restore existing session; set `user` or `null`
- [ ] Show a loading/spinner state while the initial `me` call is in flight — prevent flash of wrong route
- [ ] `login(credentials)` function: calls `POST /api/auth/login`, updates `user` on success
- [ ] `logout()` function: calls `POST /api/auth/logout`, clears `user` from context
- [ ] Create `ProtectedRoute` wrapper component:
  - If `isLoading`: render a loading spinner (not the route, not `/login`)
  - If `user` is `null`: redirect to `/login`
  - If `user` exists: render the child route
- [ ] Create `AdminRoute` wrapper component:
  - Extends `ProtectedRoute` behavior
  - Additionally checks `user.role === 'admin'` — redirect to `/` if not admin
- [ ] Wrap all application routes with `ProtectedRoute`
- [ ] Wrap all admin routes with `AdminRoute`

#### Testing
- [ ] Unit test: `AuthContext` — `GET /api/auth/me` returns user → `user` is set
- [ ] Unit test: `AuthContext` — `GET /api/auth/me` returns `401` → `user` is null
- [ ] Component test: `ProtectedRoute` — renders children when `user` is set
- [ ] Component test: `ProtectedRoute` — redirects to `/login` when `user` is null
- [ ] Component test: `ProtectedRoute` — renders loading state during initial fetch
- [ ] Component test: `AdminRoute` — renders children when `user.role === 'admin'`
- [ ] Component test: `AdminRoute` — redirects regular user to `/` (not `/login`)
- [ ] Integration test: refreshing the page with a valid cookie restores the session

### Acceptance Criteria

**Scenario 1 — Session restore on page load**
- **Given** a user has a valid JWT cookie from a previous session
- **When** the React app loads and calls `GET /api/auth/me`
- **Then** the user is set in context and they see their home screen without re-logging in

**Scenario 2 — Unauthenticated access**
- **Given** a user has no valid JWT cookie
- **When** they navigate to any protected route
- **Then** `ProtectedRoute` redirects them to `/login`

**Scenario 3 — Loading state**
- **Given** the app is making the initial `GET /api/auth/me` request
- **When** the page renders before the response arrives
- **Then** a loading indicator is shown — not the route content and not the login form

**Scenario 4 — Non-admin accessing admin route**
- **Given** an authenticated user with role `regular` navigates to an admin-only page
- **When** `AdminRoute` checks the role
- **Then** the user is redirected to `/` (not to `/login`)

**Scenario 5 — Logout**
- **Given** a user calls `logout()` from any page
- **When** `POST /api/auth/logout` succeeds
- **Then** `user` is cleared from context and the user is redirected to `/login`

### Definition of Done
- [ ] `AuthContext` wraps the entire app and is available to all components
- [ ] Session restore confirmed on hard page refresh with valid cookie
- [ ] `ProtectedRoute` and `AdminRoute` both tested with authenticated and unauthenticated states
- [ ] Loading state prevents any flash of protected content before auth is resolved
- [ ] `logout()` clears local state and redirects to `/login`

---

---

# Cross-Story Requirements

## API Summary

| Method | Endpoint | Auth Required | Admin Only | Description |
|---|---|---|---|---|
| POST | `/api/users` | Yes | Yes | Create user (admin creates all accounts) |
| POST | `/api/auth/login` | No | No | Authenticate and issue JWT cookie |
| POST | `/api/auth/logout` | No | No | Clear JWT cookie (idempotent) |
| GET | `/api/auth/me` | Yes | No | Return current user's profile |

## Security Requirements

- [ ] **bcrypt** — All passwords stored as bcrypt hashes, cost factor ≥10
- [ ] **JWT** — Signed with a secret from `process.env.JWT_SECRET`; payload: `{ userId, role, iat, exp }`
- [ ] **httpOnly cookie** — JWT never exposed to JavaScript; set with `httpOnly: true`
- [ ] **SameSite=Strict** — Cookie sent only on same-site requests
- [ ] **Secure flag** — Cookie sent only over HTTPS in production
- [ ] **Account lockout** — Login blocked after 3 consecutive failed attempts
- [ ] **No user enumeration** — Same `401` response for wrong password and unknown email
- [ ] **Role-based access control** — `requireRole()` guards all admin routes
- [ ] **Secrets in env** — No secrets, keys, or salts hardcoded in source

## Frontend Requirements

- [ ] UI language: **Hebrew only**
- [ ] Layout direction: **RTL** (`dir="rtl"` on root element)
- [ ] Login page is the **only** public route — all others require authentication
- [ ] Error messages displayed **inline** (not as toast or alert dialogs)
- [ ] Distinct error messages for: wrong credentials, locked account, server error
- [ ] Loading state on submit prevents duplicate requests

## Testing Requirements

| Test Type | Coverage Required |
|---|---|
| Unit tests | `authenticate` middleware, `requireRole` middleware, password validation logic |
| Integration tests | All four auth endpoints (happy path + error paths) |
| Auth middleware tests | Missing cookie, expired token, tampered token |
| Protected route tests | `ProtectedRoute` and `AdminRoute` components |
| Login failure tests | Wrong password, unknown email, missing fields |
| Account lockout tests | Lockout at 3rd attempt, locked state persists |
| Logout tests | Cookie cleared, subsequent request returns `401` |

---

---

# Dependencies

```
EP-1 (Infrastructure)
  └── DB schema must include: users table with columns:
        id, name, email, password_hash, role, failed_attempts,
        is_active, created_at, updated_at (soft delete: deleted_at)

EP2-S2 (Middleware) — must be completed before:
  └── EP2-S1 T2.1.1 (user creation endpoint uses requireRole)
  └── EP2-S1 T2.1.4 (me endpoint uses authenticate)
  └── EP-3, EP-4, EP-5 (all require middleware to be in place)

EP2-S1 (Backend endpoints) — must be completed before:
  └── EP2-S3 (frontend AuthContext depends on /api/auth/me and /api/auth/login)

EP2-S3 (Login UI) — must be completed before:
  └── Any manual QA of the full authentication flow
```

---

# Open Questions

| # | Question | Impact |
|---|---|---|
| OQ-1 | What is the JWT expiry duration? (8h suggested) If the user is active past expiry, should the token be refreshed silently? | Session UX |
| OQ-2 | How is a locked account unlocked? Is there an admin endpoint to reset `failed_attempts`? If so, which epic covers it? | Admin workflow |
| OQ-3 | Should `secure: true` on the cookie be conditional on `NODE_ENV === 'production'`, or enforced always? | Local dev workflow |
| OQ-4 | What is the exact Hebrew error message copy for locked accounts, wrong credentials, and server errors? | Frontend copy |
| OQ-5 | Should the logout endpoint require authentication (i.e., apply `authenticate` middleware) or be open? | Security policy |
| OQ-6 | Is there a "remember me" / persistent session requirement, or is the 8h expiry fixed? | Auth UX |
| OQ-7 | Where is the admin unlock-account flow defined? It is referenced but not included in EP-2. | Scope |

---

---

# Jira Setup Guide

## Recommended Epic Structure

```
[EP-2] User Login Logic
  ├── [EP2-S1] Backend Authentication
  │     ├── [EP2-T1] POST /api/users — Admin-only user creation
  │     ├── [EP2-T2] POST /api/auth/login — Login endpoint
  │     ├── [EP2-T3] POST /api/auth/logout — Logout endpoint
  │     └── [EP2-T4] GET /api/auth/me — Current user endpoint
  ├── [EP2-S2] Auth Middleware & Route Guards
  │     ├── [EP2-T5] authenticate middleware
  │     └── [EP2-T6] requireRole middleware
  └── [EP2-S3] Login UI
        ├── [EP2-T7] Login page (/login)
        └── [EP2-T8] AuthContext & ProtectedRoute
```

## Suggested Implementation Order

1. `EP2-T5` — `authenticate` middleware (required by almost everything else)
2. `EP2-T6` — `requireRole` middleware
3. `EP2-T2` — Login endpoint (only public auth route, no middleware needed)
4. `EP2-T3` — Logout endpoint
5. `EP2-T4` — `GET /api/auth/me`
6. `EP2-T1` — `POST /api/users` (depends on both middlewares)
7. `EP2-T7` — Login page (frontend, depends on login endpoint)
8. `EP2-T8` — `AuthContext` & `ProtectedRoute` (depends on `/api/auth/me`)

## Dependency Graph

```
EP2-T5 (authenticate)
    │
    ├──► EP2-T4 (GET /api/auth/me)
    │
    └──► EP2-T6 (requireRole)
               │
               └──► EP2-T1 (POST /api/users)

EP2-T2 (login)
    │
    └──► EP2-T7 (Login page UI)

EP2-T4 (GET /api/auth/me)
    │
    └──► EP2-T8 (AuthContext)
               │
               └──► All ProtectedRoutes in EP-3, EP-4, EP-5
```

## Suggested Jira Labels

| Label | Applied To |
|---|---|
| `authentication` | All tasks in EP-2 |
| `security` | EP2-T1, EP2-T2, EP2-T5, EP2-T6 |
| `jwt` | EP2-T2, EP2-T3, EP2-T4, EP2-T5 |
| `rbac` | EP2-T6, EP2-T1 |
| `bcrypt` | EP2-T1, EP2-T2 |
| `middleware` | EP2-T5, EP2-T6 |
| `frontend` | EP2-T7, EP2-T8 |
| `hebrew-ui` | EP2-T7 |
| `rtl` | EP2-T7 |
| `testing` | All tasks |

## Suggested Jira Components

- `Backend — Auth`
- `Backend — Middleware`
- `Frontend — Auth`
- `Frontend — Routing`
- `Security`

---

---

# Story 2.3 — Frontend Deep-Dive (Expanded)

> This section expands Story 2.3 with full implementation detail for the React frontend.
> Backend sections above remain unchanged.

---

## Architecture Blueprint

### Suggested React Folder Structure

```
frontend/src/
├── api/
│   ├── apiClient.js          # Base fetch/axios config — baseURL, withCredentials
│   └── authApi.js            # Auth-specific API functions (login, logout, me)
│
├── context/
│   ├── AuthContext.js        # Context definition + default value
│   └── AuthProvider.jsx      # Provider component — owns state, side effects
│
├── hooks/
│   ├── useAuth.js            # Consumer hook — throws if used outside AuthProvider
│   └── useLoginForm.js       # Form state, validation, submit logic
│
├── routes/
│   ├── AppRouter.jsx         # All route definitions in one place
│   ├── ProtectedRoute.jsx    # Redirects to /login if unauthenticated
│   └── AdminRoute.jsx        # Redirects to / if not admin
│
├── pages/
│   ├── LoginPage.jsx         # /login — public
│   └── HomePage.jsx          # / — protected
│
├── components/
│   ├── auth/
│   │   └── LoginForm.jsx     # Form UI — fields, button, error display
│   └── common/
│       ├── LoadingSpinner.jsx # Full-screen and inline spinner
│       └── InlineError.jsx   # RTL-aware Hebrew error message component
│
└── utils/
    ├── validation.js         # Email format check, required-field check
    └── errorMessages.js      # Hebrew string constants for all error states
```

### Component Hierarchy

```
<App>
  <AuthProvider>                   ← owns user, isLoading, login(), logout()
    <AppRouter>
      ├── /login  →  <LoginPage>   ← public — skips ProtectedRoute
      │               └── <LoginForm>
      │                     ├── <FormField> (email)
      │                     ├── <FormField> (password)
      │                     ├── <InlineError>
      │                     └── <SubmitButton>
      │
      └── <ProtectedRoute>         ← wraps all other routes
            ├── / → <HomePage>
            └── <AdminRoute>       ← wraps admin-only routes
                  └── /admin → <AdminPage>
```

### Auth Flow Diagram

```
──────────────── APP STARTUP ────────────────

App mounts
  └─► AuthProvider calls GET /api/auth/me
        ├─► 200 OK  →  user = {id, name, email, role}
        │              isLoading = false
        │              ProtectedRoute: render child route
        │
        └─► 401     →  user = null
                       isLoading = false
                       ProtectedRoute: redirect to /login

──────────────── LOGIN FLOW ─────────────────

User submits /login form
  └─► authApi.login(email, password)  →  POST /api/auth/login
        ├─► 200  →  set user in context  →  navigate('/')
        ├─► 401  →  show: "אימייל או סיסמה שגויים"
        ├─► 423  →  show: "החשבון נעול. פנה למנהל המערכת"
        └─► 5xx  →  show: "שגיאת שרת. נסה שנית"

──────────────── LOGOUT FLOW ────────────────

User triggers logout
  └─► authApi.logout()  →  POST /api/auth/logout
        └─► any response  →  user = null  →  navigate('/login')

──────────────── PROTECTED ROUTE ────────────

Any route wrapped in <ProtectedRoute>
  ├─► isLoading = true  →  render <LoadingSpinner>
  ├─► user = null       →  <Navigate to="/login" replace />
  └─► user exists       →  render children

──────────────── ADMIN ROUTE ────────────────

Any route wrapped in <AdminRoute>
  ├─► (inherits ProtectedRoute behavior)
  ├─► user.role !== 'admin'  →  <Navigate to="/" replace />
  └─► user.role === 'admin'  →  render children
```

### Suggested Route Structure

```jsx
// routes/AppRouter.jsx
<Routes>
  <Route path="/login" element={<LoginPage />} />

  <Route element={<ProtectedRoute />}>
    <Route path="/"       element={<HomePage />} />
    <Route path="/profile" element={<ProfilePage />} />

    <Route element={<AdminRoute />}>
      <Route path="/admin"         element={<AdminDashboard />} />
      <Route path="/admin/users"   element={<AdminUsersPage />} />
    </Route>
  </Route>

  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

---

---

## Task FE-2.3.A — API Service Layer

**File:** `src/api/apiClient.js`, `src/api/authApi.js`
**Type:** Frontend + Testing
**Depends on:** Backend endpoints (EP2-T2, EP2-T3, EP2-T4) deployed or mocked
**Labels:** `frontend`, `api-integration`, `authentication`

### Technical Description
Central HTTP client that all API calls go through. Must send cookies on every request (`credentials: 'include'` or axios `withCredentials: true`). The auth API module exposes typed, named functions — no raw fetch calls scattered across components.

### Subtasks

#### API Client (`apiClient.js`)
- [ ] Configure base URL from `import.meta.env.VITE_API_BASE_URL` (or equivalent)
- [ ] Set `credentials: 'include'` on every request so cookies are sent cross-origin
- [ ] Set `Content-Type: application/json` as a default header
- [ ] Return parsed JSON on success; throw a structured error object `{ status, message }` on failure
- [ ] Normalize network errors (fetch throws, no response) into the same error shape as HTTP errors

#### Auth API Module (`authApi.js`)
- [ ] `login(email, password)` → `POST /api/auth/login` — returns user object on success
- [ ] `logout()` → `POST /api/auth/logout` — returns void
- [ ] `getMe()` → `GET /api/auth/me` — returns user object or throws on 401
- [ ] Each function must propagate the HTTP status code in the thrown error so callers can branch on `401` vs `423` vs `5xx`

#### Error Normalization
- [ ] Define error shape: `{ status: number, message: string }`
- [ ] Map HTTP status codes to Hebrew-ready error keys (not message strings — keep copy in `errorMessages.js`)
- [ ] Never swallow errors silently — always rethrow after normalization

### Suggested File Structure
```
src/api/
  apiClient.js     # base config + request helper
  authApi.js       # login(), logout(), getMe()
```

### Acceptance Criteria

**Scenario 1 — Successful request**
- **Given** the server returns `200` with JSON
- **When** `apiClient` processes the response
- **Then** the parsed JSON object is returned to the caller

**Scenario 2 — HTTP error**
- **Given** the server returns `401` or `423`
- **When** `apiClient` processes the response
- **Then** a structured error `{ status, message }` is thrown

**Scenario 3 — Network failure**
- **Given** the server is unreachable
- **When** `apiClient` catches the network error
- **Then** a structured error `{ status: 0, message: 'network_error' }` is thrown

**Scenario 4 — Credentials included**
- **Given** any request is made
- **When** the browser sends it
- **Then** cookies are included in the request headers (verified via devtools / test spy)

### Edge Cases
- [ ] Server returns HTML error page (e.g., 502 from a proxy) instead of JSON — must not throw a JSON parse error to the caller
- [ ] Concurrent `getMe()` calls on app load — only one should run (handled at `AuthProvider` level, not here)
- [ ] `logout()` called when cookie is already cleared — still returns successfully (idempotent)

### Testing Requirements
- [ ] Unit test: `login()` — success path returns user object
- [ ] Unit test: `login()` — `401` throws `{ status: 401 }`
- [ ] Unit test: `login()` — `423` throws `{ status: 423 }`
- [ ] Unit test: `getMe()` — success returns user
- [ ] Unit test: `getMe()` — `401` throws (does not return null)
- [ ] Unit test: network error → throws `{ status: 0 }`
- [ ] Unit test: non-JSON response body → structured error, no JSON parse crash

### Definition of Done
- [ ] All auth API calls go through `authApi.js` — no raw fetch in components
- [ ] `credentials: 'include'` confirmed via test network spy
- [ ] Error shape is consistent across all functions
- [ ] Base URL is environment-variable-driven — no hardcoded localhost

---

## Task FE-2.3.B — Hebrew Error Message Constants

**File:** `src/utils/errorMessages.js`
**Type:** Frontend
**Depends on:** Nothing (pure utility)
**Labels:** `frontend`, `hebrew-ui`, `i18n`

### Technical Description
Single source of truth for all Hebrew user-facing strings in the auth flow. Components import constants rather than hardcoding strings, making copy changes a one-file edit.

### Subtasks
- [ ] Define `AUTH_ERRORS` object with keys: `WRONG_CREDENTIALS`, `ACCOUNT_LOCKED`, `SERVER_ERROR`, `NETWORK_ERROR`, `REQUIRED_FIELD`, `INVALID_EMAIL`
- [ ] Values are Hebrew strings:
  - `WRONG_CREDENTIALS`: `"אימייל או סיסמה שגויים"`
  - `ACCOUNT_LOCKED`: `"החשבון נעול. פנה למנהל המערכת"`
  - `SERVER_ERROR`: `"שגיאת שרת. נסה שנית"`
  - `NETWORK_ERROR`: `"אין חיבור לשרת. בדוק את החיבור לאינטרנט"`
  - `REQUIRED_FIELD`: `"שדה חובה"`
  - `INVALID_EMAIL`: `"כתובת אימייל לא תקינה"`
- [ ] Export as named constant — not a default export

### Definition of Done
- [ ] No Hebrew strings appear in JSX files directly — all imported from this file
- [ ] All six error keys defined and exported

---

## Task FE-2.3.C — Client-Side Form Validation

**File:** `src/utils/validation.js`, `src/hooks/useLoginForm.js`
**Type:** Frontend + Testing
**Depends on:** `errorMessages.js`
**Labels:** `frontend`, `validation`, `hebrew-ui`

### Technical Description
Client-side validation runs before the API call to give instant feedback on obviously invalid input (empty fields, malformed email). It does not duplicate server-side password complexity rules — the login form only needs email format and required-field checks.

### Subtasks

#### Validation Utilities (`validation.js`)
- [ ] `isValidEmail(value)` — returns `true` if value matches a standard email regex
- [ ] `isRequired(value)` — returns `true` if value is non-empty after trim
- [ ] Both functions are pure, side-effect-free, and independently unit-testable

#### Login Form Hook (`useLoginForm.js`)
- [ ] Manage form state: `{ email, password, errors, isSubmitting }`
- [ ] `handleChange(field, value)` — updates field value, clears that field's error on change
- [ ] `validate()` — runs all field validators, populates `errors`, returns `isValid` boolean
- [ ] `handleSubmit(onSuccess, onError)` — calls `validate()`, calls `authApi.login()` if valid, manages `isSubmitting`
- [ ] Prevent double-submit: `isSubmitting` flag blocks re-entry while request is in flight
- [ ] On server error: map HTTP status to error key, set `errors.form` (not field-level)

### Subtasks (validation rules for `/login` form)
- [ ] Email: required + valid format — show `REQUIRED_FIELD` or `INVALID_EMAIL`
- [ ] Password: required only — show `REQUIRED_FIELD` (no complexity check on login)
- [ ] Form-level error for `401`, `423`, `5xx`, `network` responses

### Edge Cases
- [ ] User types, clears, and resubmits — validation re-runs correctly
- [ ] Both fields empty on submit — both errors shown simultaneously
- [ ] Email with leading/trailing whitespace — trimmed before validation
- [ ] Rapid double-tap of submit on mobile — second tap blocked by `isSubmitting`

### Acceptance Criteria

**Scenario 1 — Empty email on submit**
- **Given** the email field is empty
- **When** the form is submitted
- **Then** `"שדה חובה"` appears under the email field and the API is not called

**Scenario 2 — Invalid email format**
- **Given** the email field contains `"notanemail"`
- **When** the form is submitted
- **Then** `"כתובת אימייל לא תקינה"` appears and the API is not called

**Scenario 3 — Error clears on re-type**
- **Given** a field error is displayed
- **When** the user types into that field
- **Then** the error disappears immediately

**Scenario 4 — Double submit blocked**
- **Given** the form is submitted and `isSubmitting` is `true`
- **When** the submit button is clicked again
- **Then** no second API call is made

### Testing Requirements
- [ ] Unit test: `isValidEmail` — valid email returns `true`
- [ ] Unit test: `isValidEmail` — malformed strings return `false`
- [ ] Unit test: `isRequired` — empty string returns `false`, whitespace returns `false`
- [ ] Hook test: empty email → `errors.email` set, API not called
- [ ] Hook test: invalid email format → `errors.email` set
- [ ] Hook test: valid inputs → API called once
- [ ] Hook test: `isSubmitting` is `true` during API call, `false` after
- [ ] Hook test: field error cleared when user changes that field

### Definition of Done
- [ ] Validation runs client-side before every API call
- [ ] API is never called when client-side validation fails
- [ ] `isSubmitting` correctly prevents duplicate submissions
- [ ] All validation errors displayed in Hebrew

---

## Task FE-2.3.D — AuthContext and AuthProvider

**File:** `src/context/AuthContext.js`, `src/context/AuthProvider.jsx`
**Type:** Frontend + Testing
**Depends on:** `authApi.js` (FE-2.3.A)
**Labels:** `frontend`, `authentication`, `state-management`

### Technical Description
`AuthContext` is the single source of truth for authentication state across the entire app. `AuthProvider` owns the state, performs the initial session restore, and exposes `login()` and `logout()` actions. All components access auth state via the `useAuth()` hook — never by consuming the context directly.

### Subtasks

#### `AuthContext.js`
- [ ] Create context with `createContext` — default value: `{ user: null, isLoading: true, login: async () => {}, logout: async () => {} }`
- [ ] Export the context object (needed by `AuthProvider`) and NOT intended for direct consumer use

#### `AuthProvider.jsx`
- [ ] State: `user` (object or null), `isLoading` (boolean, starts `true`)
- [ ] On mount (`useEffect`, runs once): call `authApi.getMe()`
  - On success: `setUser(data)`, `setIsLoading(false)`
  - On 401 or any error: `setUser(null)`, `setIsLoading(false)`
- [ ] `login(email, password)`:
  - Calls `authApi.login(email, password)`
  - On success: `setUser(data)` — navigation is handled by the calling component
  - On failure: rethrows the error — the form component handles error display
- [ ] `logout()`:
  - Calls `authApi.logout()`
  - Sets `setUser(null)` regardless of response — cookie is cleared server-side
- [ ] Wrap children in `<AuthContext.Provider value={{ user, isLoading, login, logout }}>`

#### `useAuth.js` hook
- [ ] `const auth = useContext(AuthContext)` — throw descriptive error if used outside `AuthProvider`
- [ ] Return the full context value — `{ user, isLoading, login, logout }`

### Edge Cases
- [ ] `getMe()` request takes a long time — `isLoading` stays `true` until it resolves (no timeout)
- [ ] `getMe()` is called once on mount only — not on every render
- [ ] `logout()` called when the server is unreachable — still clears local `user` state
- [ ] `login()` called while `isLoading` is still `true` — form component prevents this via its own `isSubmitting` flag
- [ ] Multiple components calling `useAuth()` — all receive the same state reference

### Acceptance Criteria

**Scenario 1 — Session restore success**
- **Given** a valid JWT cookie exists
- **When** `AuthProvider` mounts
- **Then** `getMe()` resolves, `user` is populated, `isLoading` becomes `false`

**Scenario 2 — Session restore failure**
- **Given** no valid cookie or expired token
- **When** `AuthProvider` mounts
- **Then** `getMe()` returns 401, `user` is `null`, `isLoading` becomes `false`

**Scenario 3 — Login success**
- **Given** correct credentials are submitted
- **When** `login()` resolves
- **Then** `user` is set in context and the value is immediately available to all consumers

**Scenario 4 — Logout**
- **Given** a user is logged in
- **When** `logout()` is called
- **Then** `user` is set to `null` regardless of server response

**Scenario 5 — useAuth outside provider**
- **Given** a component uses `useAuth()` outside `<AuthProvider>`
- **When** it renders
- **Then** it throws a clear error: `"useAuth must be used within AuthProvider"`

### Testing Requirements
- [ ] Unit test: `AuthProvider` mounts → `getMe()` is called once
- [ ] Unit test: `getMe()` success → `user` set, `isLoading` false
- [ ] Unit test: `getMe()` throws 401 → `user` null, `isLoading` false
- [ ] Unit test: `login()` success → `user` updated in context
- [ ] Unit test: `login()` failure → error rethrown, `user` unchanged
- [ ] Unit test: `logout()` → `user` set to null, `authApi.logout` called
- [ ] Unit test: `useAuth()` outside provider → throws error
- [ ] Unit test: multiple consumers see same `user` reference

### Definition of Done
- [ ] `AuthProvider` wraps the entire app at the root level
- [ ] No component reads `AuthContext` directly — all go through `useAuth()`
- [ ] `isLoading: true` on mount until `getMe()` settles
- [ ] `login()` and `logout()` do not handle navigation — callers do

---

## Task FE-2.3.E — ProtectedRoute Component

**File:** `src/routes/ProtectedRoute.jsx`
**Type:** Frontend + Testing
**Depends on:** `useAuth` (FE-2.3.D)
**Labels:** `frontend`, `routing`, `authentication`

### Technical Description
`ProtectedRoute` is an outlet-style wrapper used in React Router v6. It reads auth state from `useAuth()` and renders one of three outcomes: a loading spinner, a redirect to `/login`, or the child route outlet.

### Subtasks
- [ ] Read `{ user, isLoading }` from `useAuth()`
- [ ] If `isLoading === true`: render `<LoadingSpinner />` (full-page) — do not render the route or redirect
- [ ] If `user === null`: render `<Navigate to="/login" replace />` — preserve no URL state
- [ ] If `user` exists: render `<Outlet />` (React Router v6 pattern)
- [ ] Export as a named export for use in `AppRouter.jsx`
- [ ] Works correctly as a layout route: `<Route element={<ProtectedRoute />}>`

### Edge Cases
- [ ] Hard refresh on a protected route with a valid cookie — shows spinner until `getMe()` resolves, then renders the route (not redirects to login)
- [ ] Session expires mid-use — next API call that returns 401 must trigger re-login (handled at API layer or by a global error handler in a later epic)
- [ ] `ProtectedRoute` nested inside another `ProtectedRoute` — no duplicate redirects

### Acceptance Criteria

**Scenario 1 — Loading state**
- **Given** `isLoading` is `true`
- **When** a protected route renders
- **Then** only `<LoadingSpinner />` is shown — no flicker of the route content or login page

**Scenario 2 — Unauthenticated**
- **Given** `user` is `null` and `isLoading` is `false`
- **When** a user navigates to a protected route
- **Then** they are redirected to `/login` with `replace` (no back-button loop)

**Scenario 3 — Authenticated**
- **Given** `user` is set and `isLoading` is `false`
- **When** a protected route renders
- **Then** the child route content is rendered normally

### Testing Requirements
- [ ] Component test: `isLoading=true` → spinner rendered, no redirect
- [ ] Component test: `user=null, isLoading=false` → `<Navigate to="/login" />` rendered
- [ ] Component test: `user={...}, isLoading=false` → outlet/children rendered
- [ ] Integration test: hard refresh on `/` with valid session → route renders after spinner

### Definition of Done
- [ ] No flash of protected content before auth is confirmed
- [ ] `replace` used on redirect (no back-button loop to protected route)
- [ ] Works as a React Router v6 layout route

---

## Task FE-2.3.F — AdminRoute Component

**File:** `src/routes/AdminRoute.jsx`
**Type:** Frontend + Testing
**Depends on:** `ProtectedRoute` (FE-2.3.E), `useAuth` (FE-2.3.D)
**Labels:** `frontend`, `routing`, `rbac`

### Technical Description
`AdminRoute` composes `ProtectedRoute` logic (auth check) and adds a role check. A non-admin authenticated user is redirected to `/` — not to `/login` — because they are valid users who simply lack the role.

### Subtasks
- [ ] Read `{ user, isLoading }` from `useAuth()`
- [ ] If `isLoading`: render `<LoadingSpinner />`
- [ ] If `user === null`: render `<Navigate to="/login" replace />`
- [ ] If `user.role !== 'admin'`: render `<Navigate to="/" replace />`
- [ ] If `user.role === 'admin'`: render `<Outlet />`
- [ ] Do not duplicate `ProtectedRoute` — compose by importing its redirect logic or share the check in a utility

### Edge Cases
- [ ] User is admin but JWT expires mid-session — treated as unauthenticated on next route render
- [ ] Role value is unexpectedly `undefined` (malformed token) — treated as non-admin, redirect to `/`
- [ ] Future roles added (e.g., `manager`) — `AdminRoute` only checks for `'admin'` exactly

### Acceptance Criteria

**Scenario 1 — Admin user**
- **Given** `user.role === 'admin'`
- **When** an admin route renders
- **Then** the route content is displayed

**Scenario 2 — Regular user**
- **Given** `user.role === 'regular'` and the user is authenticated
- **When** they navigate to an admin route
- **Then** they are redirected to `/` (not to `/login`)

**Scenario 3 — Unauthenticated user**
- **Given** `user === null`
- **When** they navigate to an admin route
- **Then** they are redirected to `/login`

### Testing Requirements
- [ ] Component test: admin user → `<Outlet />` rendered
- [ ] Component test: regular user (authenticated) → `<Navigate to="/" />`
- [ ] Component test: unauthenticated → `<Navigate to="/login" />`
- [ ] Component test: `isLoading=true` → spinner shown

### Definition of Done
- [ ] Regular users cannot access any admin route, even by typing the URL directly
- [ ] Redirect destination is `/` for role failure, `/login` for auth failure
- [ ] No duplicate auth-check logic copied from `ProtectedRoute`

---

## Task FE-2.3.G — LoginPage and LoginForm Components

**Files:** `src/pages/LoginPage.jsx`, `src/components/auth/LoginForm.jsx`
**Type:** Frontend + Testing
**Depends on:** `useLoginForm` (FE-2.3.C), `errorMessages.js` (FE-2.3.B), `useAuth` (FE-2.3.D)
**Labels:** `frontend`, `hebrew-ui`, `rtl`, `authentication`

### Technical Description
`LoginPage` is the container rendered at `/login`. It redirects away immediately if the user is already authenticated. `LoginForm` is the presentational + logic component — it uses `useLoginForm()` for state and calls `useAuth().login()` for the API action.

### Subtasks

#### `LoginPage.jsx`
- [ ] Read `{ user, isLoading }` from `useAuth()`
- [ ] If `isLoading`: render `<LoadingSpinner />` (auth state not yet known)
- [ ] If `user` exists: `<Navigate to="/" replace />` immediately
- [ ] Otherwise: render `<LoginForm />`
- [ ] Set `document.title` or page heading in Hebrew

#### `LoginForm.jsx`
- [ ] Use `useLoginForm()` hook for all form state
- [ ] Email `<input>` with:
  - `id="email"`, `type="email"`, `name="email"`, `dir="rtl"`
  - `<label htmlFor="email">`: `"דואר אלקטרוני"`
  - `aria-describedby` pointing to error element when error exists
  - `aria-invalid="true"` when field has an error
- [ ] Password `<input>` with:
  - `id="password"`, `type="password"`, `name="password"`, `dir="rtl"`
  - `<label htmlFor="password">`: `"סיסמה"`
  - Same aria pattern as email
- [ ] Submit `<button>`:
  - Hebrew label: `"התחבר"`
  - `disabled` when `isSubmitting`
  - Shows Hebrew loading text `"מתחבר..."` while `isSubmitting`
- [ ] `<InlineError>` component below each field for field-level errors
- [ ] `<InlineError>` below the button for form-level errors (401, 423, 5xx)
- [ ] On successful `login()`: `navigate('/')`
- [ ] On failed `login()`: map error status to `AUTH_ERRORS` key, display via `<InlineError>`

#### `InlineError.jsx`
- [ ] Accepts `message` prop (string or null)
- [ ] Renders `null` when `message` is falsy
- [ ] RTL-aware: `role="alert"`, `dir="rtl"`, styled in red
- [ ] Used both for field errors and form-level errors

#### `LoadingSpinner.jsx`
- [ ] Accepts optional `fullPage` prop — centers spinner in viewport when `true`
- [ ] Has `aria-label="טוען..."` for screen readers

### Styling & RTL Requirements
- [ ] Wrap the entire form in a container with `dir="rtl"`
- [ ] Labels render to the right of (or above) inputs
- [ ] Input text is right-aligned by default
- [ ] Error messages are right-aligned
- [ ] Submit button is full-width or right-aligned per design
- [ ] Form is centered on screen, mobile-first (max-width ~360px card)
- [ ] Responsive: works on 320px screens without horizontal scroll

### Accessibility Requirements
- [ ] All inputs have associated `<label>` elements (not placeholder-only)
- [ ] Error messages linked via `aria-describedby`
- [ ] `aria-invalid="true"` on inputs with errors
- [ ] `role="alert"` on `<InlineError>` so screen readers announce new errors
- [ ] Submit button is a native `<button type="submit">` — not a div
- [ ] Form is submitted on Enter key in any field (native form behavior)
- [ ] Focus moves to first error field on failed validation
- [ ] Color contrast meets WCAG AA (≥4.5:1 for body text)
- [ ] Loading state communicated via text change, not color alone

### Edge Cases
- [ ] User pastes email with whitespace — trim before validation/submit
- [ ] User submits with Caps Lock on — no special behavior (password is masked)
- [ ] Very long email address — input does not overflow the card
- [ ] Page is zoomed to 200% — form remains usable
- [ ] Slow network — spinner stays visible for the full duration of the request

### Acceptance Criteria

**Scenario 1 — Render**
- **Given** the user is unauthenticated
- **When** `/login` is loaded
- **Then** the form renders with Hebrew labels, RTL direction, and no pre-filled values

**Scenario 2 — Successful login**
- **Given** the user enters valid credentials
- **When** they submit
- **Then** the button shows `"מתחבר..."`, the API is called, and on success they are navigated to `/`

**Scenario 3 — Wrong credentials**
- **Given** the server returns `401`
- **When** the response is received
- **Then** `"אימייל או סיסמה שגויים"` appears inline below the button

**Scenario 4 — Locked account**
- **Given** the server returns `423`
- **When** the response is received
- **Then** `"החשבון נעול. פנה למנהל המערכת"` appears inline (distinct from 401 message)

**Scenario 5 — Already authenticated**
- **Given** the user has a valid session
- **When** they navigate to `/login`
- **Then** they are redirected to `/` without seeing the form

**Scenario 6 — Accessibility**
- **Given** the login form is rendered
- **When** a screen reader user interacts with it
- **Then** all labels, errors, and states are announced correctly in Hebrew

### Testing Requirements
- [ ] Component test: renders email label `"דואר אלקטרוני"` and password label `"סיסמה"`
- [ ] Component test: `dir="rtl"` on form container
- [ ] Component test: button text is `"התחבר"` initially, `"מתחבר..."` during submit
- [ ] Component test: button `disabled` when `isSubmitting`
- [ ] Component test: field error renders when `errors.email` is set
- [ ] Component test: form-level error renders for 401 and 423 (distinct messages)
- [ ] Component test: error message has `role="alert"`
- [ ] Component test: inputs have correct `aria-invalid` and `aria-describedby` when errors present
- [ ] Integration test: submit with empty fields → no API call, errors shown
- [ ] Integration test: submit with valid inputs, API returns 200 → navigate to `/`
- [ ] Integration test: API returns 401 → Hebrew error shown, user stays on `/login`
- [ ] Integration test: API returns 423 → distinct Hebrew error shown
- [ ] Integration test: authenticated user on `/login` → redirected to `/`

### Definition of Done
- [ ] Form is Hebrew-only, fully RTL, no English text visible
- [ ] Three distinct error states (401, 423, 5xx) display different Hebrew messages
- [ ] Duplicate submit is impossible while request is in-flight
- [ ] All ARIA attributes are correct and verified in component tests
- [ ] Login page redirects away immediately for authenticated users

---

## Task FE-2.3.H — Loading States

**Files:** `src/components/common/LoadingSpinner.jsx`, usage in `ProtectedRoute`, `AdminRoute`, `LoginPage`, `AuthProvider`
**Type:** Frontend + Testing
**Depends on:** `AuthContext` (FE-2.3.D)
**Labels:** `frontend`, `ux`, `accessibility`

### Technical Description
Loading states exist at two levels: (1) full-page spinner while the initial `GET /api/auth/me` runs, and (2) inline button state during form submission. Both must prevent the user from seeing incorrect UI or submitting duplicate requests.

### Subtasks
- [ ] `<LoadingSpinner fullPage />` — centers spinner in viewport, used in `ProtectedRoute`, `AdminRoute`, `LoginPage`
- [ ] `<LoadingSpinner />` — inline variant for future use
- [ ] Spinner has `aria-label="טוען..."` and `role="status"` for screen readers
- [ ] `ProtectedRoute` renders spinner when `isLoading`, never briefly renders children or redirect
- [ ] `AdminRoute` same spinner behavior
- [ ] `LoginPage` renders spinner if `isLoading` (auth state still unknown)
- [ ] `LoginForm` button shows `"מתחבר..."` text and is `disabled` during API call
- [ ] No content flicker: the sequence is always `spinner → content` or `spinner → redirect`, never `content → redirect`

### Edge Cases
- [ ] `getMe()` resolves in under 50ms (fast local dev) — spinner still rendered, even briefly, so logic is consistent
- [ ] `getMe()` never resolves (network hang) — spinner stays visible indefinitely; no timeout implemented (per spec — add to Open Questions if timeout is needed)

### Testing Requirements
- [ ] Component test: `<LoadingSpinner fullPage />` renders with `aria-label="טוען..."`
- [ ] Component test: `ProtectedRoute` with `isLoading=true` → spinner, not children
- [ ] Component test: `LoginPage` with `isLoading=true` → spinner, not form

### Definition of Done
- [ ] No flash of unauthenticated content before auth state is resolved
- [ ] All spinners have Hebrew `aria-label`

---

## Task FE-2.3.I — Session Restore and Logout Flow

**Files:** `src/context/AuthProvider.jsx`, `src/api/authApi.js`
**Type:** Frontend + Testing
**Depends on:** `AuthProvider` (FE-2.3.D), `authApi.js` (FE-2.3.A)
**Labels:** `frontend`, `authentication`, `cookie-auth`

### Technical Description
Session restore happens automatically on every app load via `GET /api/auth/me`. The browser sends the `httpOnly` cookie automatically because of `credentials: 'include'`. Logout clears server-side cookie and local state.

### Subtasks

#### Session Restore
- [ ] `AuthProvider` calls `getMe()` in a `useEffect` with an empty dependency array — runs once on mount
- [ ] On success: populate `user`, set `isLoading = false`
- [ ] On failure (any error including 401): set `user = null`, `isLoading = false`
- [ ] The effect never re-runs unless the component remounts

#### Logout Flow
- [ ] `logout()` in `AuthProvider`:
  1. Calls `authApi.logout()` (fire-and-forget is acceptable — always clear local state)
  2. Sets `user = null`
  3. Does NOT navigate — the component that calls `logout()` handles navigation
- [ ] Components that trigger logout (e.g., a nav button) call `const { logout } = useAuth()` then `await logout()` then `navigate('/login')`
- [ ] After logout, any call to a protected route returns `401` — the `ProtectedRoute` redirect handles sending the user to `/login`

### Edge Cases
- [ ] User logs out in one browser tab — other tabs still show authenticated state until their next navigation (acceptable for now; real-time sync is out of scope)
- [ ] `authApi.logout()` fails (network error) — `user` is still cleared locally, user is still sent to `/login`
- [ ] Cookie expires server-side while user is active — next `ProtectedRoute` render will redirect to `/login` when the next `getMe()`-equivalent call fails (this is a future concern for token refresh)

### Acceptance Criteria

**Scenario 1 — Page refresh with valid cookie**
- **Given** a user has a valid JWT cookie
- **When** they hard-refresh the browser
- **Then** `getMe()` succeeds, `user` is populated, and the protected page renders without redirecting to `/login`

**Scenario 2 — Page refresh with expired cookie**
- **Given** the JWT cookie has expired
- **When** the user hard-refreshes
- **Then** `getMe()` returns `401`, `user` is `null`, and the user is redirected to `/login`

**Scenario 3 — Successful logout**
- **Given** a user is authenticated
- **When** they click the logout button
- **Then** `POST /api/auth/logout` is called, `user` is cleared, and they land on `/login`

**Scenario 4 — Logout despite network error**
- **Given** the server is unreachable
- **When** the user triggers logout
- **Then** local `user` state is still cleared and they are redirected to `/login`

### Testing Requirements
- [ ] Unit test: `AuthProvider` mount → `getMe()` called exactly once
- [ ] Unit test: `getMe()` 200 → user set
- [ ] Unit test: `getMe()` 401 → user null, isLoading false
- [ ] Unit test: `logout()` calls `authApi.logout()` and sets user to null
- [ ] Unit test: `logout()` sets user to null even when `authApi.logout()` throws
- [ ] Integration test: hard refresh with valid cookie → protected route renders

### Definition of Done
- [ ] Session is restored on every page load without requiring re-login
- [ ] Logout always clears local state, regardless of server response
- [ ] No navigation logic inside `AuthProvider` — callers navigate

---

## Task FE-2.3.J — Role-Based Routing

**File:** `src/routes/AppRouter.jsx`
**Type:** Frontend + Testing
**Depends on:** `ProtectedRoute` (FE-2.3.E), `AdminRoute` (FE-2.3.F)
**Labels:** `frontend`, `routing`, `rbac`

### Technical Description
All route definitions live in `AppRouter.jsx`. Public routes are defined at the top level. Protected routes are nested inside `<ProtectedRoute>`. Admin routes are nested inside `<AdminRoute>` which is itself inside `<ProtectedRoute>`.

### Subtasks
- [ ] Define `<Route path="/login" element={<LoginPage />} />` as a public route — no wrapper
- [ ] Define `<Route element={<ProtectedRoute />}>` as the parent for all authenticated routes
- [ ] Inside `ProtectedRoute`: define `<Route path="/" element={<HomePage />} />`
- [ ] Define `<Route element={<AdminRoute />}>` nested inside `ProtectedRoute` for admin pages
- [ ] Add a catch-all `<Route path="*" element={<Navigate to="/" replace />} />` for unknown URLs
- [ ] Export `AppRouter` and mount it inside `<AuthProvider>` in `App.jsx`

### Route Table

| Path | Wrapper | Component | Access |
|---|---|---|---|
| `/login` | none | `LoginPage` | Public |
| `/` | `ProtectedRoute` | `HomePage` | Any auth user |
| `/admin` | `ProtectedRoute` + `AdminRoute` | `AdminDashboard` | Admin only |
| `/admin/users` | `ProtectedRoute` + `AdminRoute` | `AdminUsersPage` | Admin only |
| `*` | none | `Navigate to="/"` | Fallback |

### Edge Cases
- [ ] User navigates to `/admin` by typing URL directly — `AdminRoute` catches and redirects to `/`
- [ ] User navigates to `/nonexistent` — catch-all redirects to `/`
- [ ] Browser back button after logout — back to protected route triggers `ProtectedRoute` redirect to `/login`

### Acceptance Criteria

**Scenario 1 — Direct URL to admin route as regular user**
- **Given** a regular user is authenticated
- **When** they type `/admin` in the browser address bar
- **Then** they are redirected to `/`

**Scenario 2 — Catch-all**
- **Given** a user navigates to `/nonsense/path`
- **When** no route matches
- **Then** they are redirected to `/`

### Testing Requirements
- [ ] Integration test: regular user → `/admin` → redirected to `/`
- [ ] Integration test: admin user → `/admin` → admin page rendered
- [ ] Integration test: unauthenticated → `/` → redirected to `/login`
- [ ] Integration test: unknown path → redirected to `/`

### Definition of Done
- [ ] All routes declared in one file (`AppRouter.jsx`)
- [ ] No route is accessible without the correct auth state
- [ ] Catch-all handles unknown URLs gracefully

---

## Task FE-2.3.K — React Testing Setup and Test Coverage

**Files:** Test files co-located with components, or in `__tests__/` folders
**Type:** Testing
**Depends on:** All FE-2.3.x tasks
**Labels:** `testing`, `frontend`, `react-testing-library`

### Technical Description
All frontend tests use React Testing Library (RTL) with Jest or Vitest. Tests interact with the DOM the way a user would — no testing of implementation details. `AuthContext` is mocked in component tests. `authApi` is mocked in hook and context tests.

### Test Setup Subtasks
- [ ] Install and configure React Testing Library: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- [ ] Create a `renderWithAuth(ui, { user, isLoading })` test utility that wraps the component in a mocked `AuthContext.Provider` — reused across all auth-dependent component tests
- [ ] Create a `renderWithRouter(ui)` test utility that wraps in `MemoryRouter` for route-testing components
- [ ] Mock `src/api/authApi.js` globally in test setup so no real HTTP calls happen

### Test Coverage Targets

| Module | Target Coverage |
|---|---|
| `authApi.js` | 90%+ |
| `useLoginForm.js` | 90%+ |
| `AuthProvider.jsx` | 85%+ |
| `LoginForm.jsx` | 85%+ |
| `ProtectedRoute.jsx` | 100% |
| `AdminRoute.jsx` | 100% |
| `validation.js` | 100% |
| `errorMessages.js` | N/A (constants) |

### Full Test Checklist

#### `validation.js`
- [ ] `isValidEmail`: valid, invalid (no @, no domain, empty)
- [ ] `isRequired`: empty string, whitespace-only, valid value

#### `authApi.js`
- [ ] `login()` success, 401, 423, network error
- [ ] `logout()` success, network error (returns without throwing)
- [ ] `getMe()` success, 401
- [ ] `credentials: 'include'` passed in every request

#### `useLoginForm.js`
- [ ] Initial state: empty fields, no errors, not submitting
- [ ] `handleChange` updates field, clears error
- [ ] Validate: empty email → error, invalid email → error, empty password → error
- [ ] Submit: valid inputs → API called; invalid inputs → API not called
- [ ] `isSubmitting` true during API call, false after
- [ ] 401 response → `errors.form` set to `WRONG_CREDENTIALS` key
- [ ] 423 response → `errors.form` set to `ACCOUNT_LOCKED` key

#### `AuthProvider.jsx`
- [ ] Mounts → `getMe()` called once
- [ ] `getMe()` 200 → user set, isLoading false
- [ ] `getMe()` 401 → user null, isLoading false
- [ ] `login()` success → user set
- [ ] `login()` failure → rethrows, user unchanged
- [ ] `logout()` → user null, `authApi.logout` called
- [ ] `logout()` when API throws → user still null

#### `LoginForm.jsx`
- [ ] Renders with Hebrew labels
- [ ] `dir="rtl"` on container
- [ ] Submit button label, disabled state, loading text
- [ ] Error messages render for each error type
- [ ] `role="alert"` on error element
- [ ] `aria-invalid` on input with error
- [ ] Navigate to `/` on successful login

#### `ProtectedRoute.jsx`
- [ ] isLoading → spinner
- [ ] user null → Navigate to /login
- [ ] user exists → Outlet rendered

#### `AdminRoute.jsx`
- [ ] isLoading → spinner
- [ ] user null → Navigate to /login
- [ ] user.role regular → Navigate to /
- [ ] user.role admin → Outlet rendered

#### `AppRouter.jsx`
- [ ] `/login` renders without auth
- [ ] `/` redirects to `/login` when unauthenticated
- [ ] `/admin` redirects to `/` for regular user
- [ ] `/admin` renders for admin user
- [ ] Unknown path redirects to `/`

### Definition of Done
- [ ] All unit and component tests pass
- [ ] No real HTTP calls in tests — all API functions mocked
- [ ] `renderWithAuth` utility used consistently across all component tests
- [ ] 80%+ coverage across all frontend auth modules

---

---

## Updated Frontend Jira Structure for Story 2.3

```
[SCRUM-97] Story 2.3 — Login UI
  ├── [FE-A] API Service Layer (apiClient + authApi)
  ├── [FE-B] Hebrew Error Message Constants
  ├── [FE-C] Client-Side Form Validation (validation.js + useLoginForm hook)
  ├── [FE-D] AuthContext and AuthProvider
  ├── [FE-E] ProtectedRoute Component
  ├── [FE-F] AdminRoute Component
  ├── [FE-G] LoginPage and LoginForm Components (Hebrew RTL)
  ├── [FE-H] Loading States (LoadingSpinner)
  ├── [FE-I] Session Restore and Logout Flow
  ├── [FE-J] Role-Based Route Structure (AppRouter)
  └── [FE-K] React Testing Setup and Coverage
```

## Updated Frontend Implementation Order

1. `FE-B` — Error message constants (no dependencies)
2. `FE-A` — API service layer (no React dependencies)
3. `FE-C` — Validation utils (no React dependencies)
4. `FE-D` — AuthContext + AuthProvider (depends on FE-A)
5. `FE-E` — ProtectedRoute (depends on FE-D)
6. `FE-F` — AdminRoute (depends on FE-D, FE-E)
7. `FE-H` — LoadingSpinner (standalone, needed by FE-E/F/G)
8. `FE-G` — LoginPage + LoginForm (depends on FE-A, FE-B, FE-C, FE-D, FE-H)
9. `FE-I` — Session restore + logout (verified via integration, depends on FE-D, FE-G)
10. `FE-J` — AppRouter with all routes (depends on FE-E, FE-F, FE-G)
11. `FE-K` — Full test suite (last — all modules must exist)

## Updated Frontend Dependency Graph

```
FE-B (errorMessages)
    └──► FE-C (validation + useLoginForm)
              └──► FE-G (LoginForm)

FE-A (apiClient + authApi)
    ├──► FE-D (AuthProvider)
    │         ├──► FE-E (ProtectedRoute)
    │         │         └──► FE-J (AppRouter)
    │         ├──► FE-F (AdminRoute)
    │         │         └──► FE-J
    │         └──► FE-I (session restore + logout)
    └──► FE-G (LoginForm uses login())

FE-H (LoadingSpinner)
    ├──► FE-E
    ├──► FE-F
    └──► FE-G

FE-K (tests) ──► all of the above
```

## Additional Open Questions (Frontend)

| # | Question | Impact |
|---|---|---|
| OQ-FE-1 | Which HTTP client? `fetch` (native) or `axios`? Axios gives better error handling and interceptors. | `apiClient.js` implementation |
| OQ-FE-2 | Which router version? React Router v6 (Outlet pattern) assumed above — confirm. | `ProtectedRoute` implementation |
| OQ-FE-3 | CSS approach? Plain CSS / CSS Modules / Tailwind / styled-components? | All component styling |
| OQ-FE-4 | Is there a design system or component library (e.g., Ant Design, Chakra, MUI) already decided? | Login form styling |
| OQ-FE-5 | Should the loading spinner have a minimum display time (e.g., 300ms) to prevent flash? | UX decision |
| OQ-FE-6 | What Hebrew font is specified? (Noto Sans Hebrew, Assistant, or system font?) | Typography |
| OQ-FE-7 | Should `useLoginForm` reset form fields after a failed attempt, or preserve the email? | UX decision |
| OQ-FE-8 | Where does the logout button live? (Navbar, user menu?) Which epic defines the app shell? | Component ownership |
