## ADDED Requirements

### Requirement: Global authentication via cookie JWT

The system SHALL verify a JWT from the `token` HttpOnly cookie on every incoming request before reaching any route handler, except explicitly exempted paths.

The JWT secret SHALL be read exclusively from `process.env.JWT_SECRET`. It SHALL never be hardcoded.

On a valid token, the middleware SHALL attach `{ id: payload.sub, role: payload.role }` to `req.user` and call `next()`.

#### Scenario: Missing cookie returns 401

- **WHEN** a request arrives with no `token` cookie
- **THEN** the middleware SHALL call `next` with an `UnauthorizedError` (HTTP 401, code `UNAUTHENTICATED`)

#### Scenario: Expired token returns 401

- **WHEN** a request arrives with a `token` cookie whose JWT is expired
- **THEN** the middleware SHALL call `next` with an `UnauthorizedError` (HTTP 401, code `UNAUTHENTICATED`)

#### Scenario: Invalid signature returns 401

- **WHEN** a request arrives with a `token` cookie whose JWT signature does not match `JWT_SECRET`
- **THEN** the middleware SHALL call `next` with an `UnauthorizedError` (HTTP 401, code `UNAUTHENTICATED`)

#### Scenario: Valid token attaches req.user

- **WHEN** a request arrives with a valid `token` cookie
- **THEN** the middleware SHALL set `req.user.id` to `payload.sub` and `req.user.role` to `payload.role`, then call `next()` with no arguments

### Requirement: Login endpoint is exempt from global authentication

The system SHALL allow `POST /api/auth/login` to be called without a valid JWT cookie.

#### Scenario: Login request bypasses authenticate middleware

- **WHEN** `POST /api/auth/login` is called without a `token` cookie
- **THEN** the request SHALL reach the login controller (not return 401)

### Requirement: Health check and API docs are exempt from global authentication

The system SHALL allow `GET /api/health` and all requests to `/api-docs` to be called without authentication.

#### Scenario: Health check is reachable without a token

- **WHEN** `GET /api/health` is called without a `token` cookie
- **THEN** the response SHALL be HTTP 200

### Requirement: Role-based access control via requireRole

The system SHALL provide a `requireRole(...roles)` factory that returns a middleware enforcing that `req.user.role` is one of the supplied roles.

#### Scenario: req.user absent returns 401

- **WHEN** `requireRole` runs and `req.user` is undefined
- **THEN** the middleware SHALL call `next` with an `UnauthorizedError` (HTTP 401, code `UNAUTHENTICATED`)

#### Scenario: Disallowed role returns 403

- **WHEN** `requireRole('admin')` runs and `req.user.role` is `'employee'`
- **THEN** the middleware SHALL call `next` with a `ForbiddenError` (HTTP 403, code `FORBIDDEN`)

#### Scenario: Allowed single role passes

- **WHEN** `requireRole('admin')` runs and `req.user.role` is `'admin'`
- **THEN** the middleware SHALL call `next()` with no arguments

#### Scenario: Multiple allowed roles — first role passes

- **WHEN** `requireRole('admin', 'manager')` runs and `req.user.role` is `'admin'`
- **THEN** the middleware SHALL call `next()` with no arguments

#### Scenario: Multiple allowed roles — second role passes

- **WHEN** `requireRole('admin', 'manager')` runs and `req.user.role` is `'manager'`
- **THEN** the middleware SHALL call `next()` with no arguments

#### Scenario: Role is read from JWT payload only

- **WHEN** a request includes a `role` field in the request body different from the JWT payload role
- **THEN** the middleware SHALL use the role from `req.user` (JWT payload), not the request body

### Requirement: POST /api/users is protected by admin role

The system SHALL require an `admin` role for `POST /api/users`.

#### Scenario: Unauthenticated request rejected

- **WHEN** `POST /api/users` is called without a `token` cookie
- **THEN** the response SHALL be HTTP 401

#### Scenario: Employee role rejected

- **WHEN** `POST /api/users` is called with a valid `employee` JWT
- **THEN** the response SHALL be HTTP 403

#### Scenario: Admin role accepted

- **WHEN** `POST /api/users` is called with a valid `admin` JWT and valid body
- **THEN** the response SHALL be HTTP 201

### Requirement: Admin-only skeleton routes are guarded

The system SHALL apply `requireRole('admin')` to all routes under `/api/clients`, `/api/projects`, `/api/tasks`, `/api/month-locks`, and `/api/admin`.

#### Scenario: Non-admin request to a guarded skeleton route

- **WHEN** an authenticated `employee` calls any method on `/api/clients`, `/api/projects`, `/api/tasks`, `/api/month-locks`, or `/api/admin`
- **THEN** the response SHALL be HTTP 403

#### Scenario: Unauthenticated request to a guarded skeleton route

- **WHEN** an unauthenticated request is sent to `/api/clients`
- **THEN** the response SHALL be HTTP 401
