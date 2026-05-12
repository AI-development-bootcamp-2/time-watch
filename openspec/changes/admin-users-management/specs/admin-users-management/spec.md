## ADDED Requirements

### Requirement: Admin can list all users

The system SHALL provide `GET /api/users` guarded by `requireRole('admin')`. It SHALL return all non-deleted users regardless of active status, including `id`, `full_name`, `email`, `role`, `is_active`, and `created_at`. Sensitive fields (`password_hash`, `failed_attempts`, `locked_until`) SHALL NOT appear in any response.

#### Scenario: Admin retrieves user list

- **WHEN** an authenticated admin calls `GET /api/users`
- **THEN** the response SHALL be HTTP 200 with an array of user objects sorted by full name ascending

#### Scenario: Non-admin is rejected

- **WHEN** an authenticated employee calls `GET /api/users`
- **THEN** the response SHALL be HTTP 403 Forbidden

#### Scenario: Unauthenticated request is rejected

- **WHEN** `GET /api/users` is called with no token cookie
- **THEN** the response SHALL be HTTP 401

#### Scenario: Sensitive fields are stripped

- **WHEN** the admin receives the user list
- **THEN** the response SHALL NOT contain `password_hash`, `failed_attempts`, or `locked_until` on any user object

---

### Requirement: Admin can create a new user

The system SHALL accept `POST /api/users` with `{ full_name, email, password, role }`. The password SHALL be validated for complexity (≥ 8 chars, ≥ 1 uppercase, ≥ 1 lowercase, ≥ 1 digit, ≥ 1 special character) and hashed with bcrypt (cost 12). The email SHALL be unique (case-insensitive). Every admin-created user SHALL be stored with `must_change_password = true`, marking the provided password as temporary.

**Request body:**
```json
{
  "full_name": "ישראל ישראלי",
  "email": "israel@example.com",
  "password": "Temp1234!",
  "role": "employee"
}
```

**Success — 201 Created:**
```json
{
  "id": "uuid",
  "full_name": "ישראל ישראלי",
  "email": "israel@example.com",
  "role": "employee",
  "is_active": true,
  "must_change_password": true,
  "created_at": "2026-05-12T10:00:00.000Z"
}
```

#### Scenario: Duplicate email returns 409

- **WHEN** an admin submits `POST /api/users` with an email that already exists (case-insensitive)
- **THEN** the response SHALL be HTTP 409 Conflict with `code: "EMAIL_CONFLICT"`

#### Scenario: Weak password returns 422

- **WHEN** an admin submits a password that fails at least one complexity rule
- **THEN** the response SHALL be HTTP 422 Unprocessable Entity with a message describing the violated rule

#### Scenario: Valid creation returns 201

- **WHEN** an admin submits a valid payload
- **THEN** the response SHALL be HTTP 201 Created with the user object; no password fields SHALL be present

#### Scenario: Admin-created user is flagged as must_change_password

- **WHEN** an admin successfully creates a user via `POST /api/users`
- **THEN** the response SHALL include `must_change_password: true` and the stored database row SHALL have `must_change_password = true`

---

### Requirement: Admin can update an existing user

The system SHALL accept `PUT /api/users/:id` with optional fields `{ full_name, email, role, password }`. If `password` is supplied, it SHALL be re-validated for complexity and re-hashed with bcrypt (cost 12). Email uniqueness is enforced across all other users.

**Success — 200 OK:**
```json
{
  "id": "uuid",
  "full_name": "שם חדש",
  "email": "new@example.com",
  "role": "admin",
  "is_active": true,
  "created_at": "2026-05-12T10:00:00.000Z"
}
```

#### Scenario: Successful update

- **WHEN** an admin submits valid changes via `PUT /api/users/:id`
- **THEN** the response SHALL be HTTP 200 with the updated user object (no password fields)

#### Scenario: Target user not found

- **WHEN** the `:id` does not correspond to any non-deleted user
- **THEN** the response SHALL be HTTP 404 Not Found

#### Scenario: Email collision on update

- **WHEN** the new email is already used by a different user
- **THEN** the response SHALL be HTTP 409 Conflict with `code: "EMAIL_CONFLICT"`

#### Scenario: Weak new password

- **WHEN** the supplied `password` field fails at least one complexity rule
- **THEN** the response SHALL be HTTP 422 Unprocessable Entity

#### Scenario: Non-admin is rejected

- **WHEN** an authenticated employee calls `PUT /api/users/:id`
- **THEN** the response SHALL be HTTP 403 Forbidden

---

### Requirement: Admin can soft-deactivate a user with a transactional last-admin guard

The system SHALL accept `PATCH /api/users/:id/deactivate`. The deactivation logic SHALL run inside a single database transaction that uses `SELECT ... FOR UPDATE` to lock the target user row and all active-admin rows before any decision is made. This prevents a race condition where two concurrent requests each observe two active admins and both succeed, leaving zero active admins.

The sequence inside the transaction SHALL be:
1. `SELECT ... FOR UPDATE` on the target user row — abort with 404 if not found.
2. If target is already inactive — commit and return 200 (idempotent).
3. If target role is `admin` — `SELECT id ... FOR UPDATE` on all active-admin rows (PostgreSQL does not support `FOR UPDATE` on aggregate queries); count the returned rows in service code; if count ≤ 1 — roll back and return 400.
4. `UPDATE users SET is_active = false` — commit and return 200.

#### Scenario: Successful deactivation

- **WHEN** an admin deactivates a user who is not the last active admin
- **THEN** the system SHALL execute steps 1 → 4 atomically; the response SHALL be HTTP 200 with `is_active: false`

#### Scenario: Last active admin is blocked

- **WHEN** an admin attempts to deactivate the only remaining active admin
- **THEN** the transaction SHALL be rolled back and the response SHALL be HTTP 400 with `message: "Cannot deactivate the last active admin"`

#### Scenario: Concurrent deactivation of the last admin is blocked

- **WHEN** two simultaneous requests both attempt to deactivate the last active admin
- **THEN** the `FOR UPDATE` lock serialises the two transactions; exactly one SHALL receive 400 and the admin account SHALL remain active

#### Scenario: Deactivation is idempotent

- **WHEN** an admin sends `PATCH /api/users/:id/deactivate` for a user who is already inactive
- **THEN** the response SHALL be HTTP 200 and no UPDATE statement is issued

#### Scenario: Target user not found

- **WHEN** the `:id` does not match any non-deleted user
- **THEN** the transaction SHALL be rolled back and the response SHALL be HTTP 404 Not Found

#### Scenario: Non-admin is rejected

- **WHEN** an authenticated employee calls `PATCH /api/users/:id/deactivate`
- **THEN** the response SHALL be HTTP 403 Forbidden (the route guard fires before the transaction opens)

---

### Requirement: users table includes must_change_password column

The `users` table SHALL have a `must_change_password BOOLEAN NOT NULL DEFAULT false` column. Admin-created users SHALL have `must_change_password = true` at insertion time. Users who change their password via `POST /api/auth/change-password` SHALL have it reset to `false`. The field SHALL appear in all user-listing and user-lookup response objects.

#### Scenario: Existing rows unaffected by migration

- **WHEN** the migration adding `must_change_password` runs on a database with existing rows
- **THEN** all pre-existing users SHALL have `must_change_password = false` (enforced by the column `DEFAULT false`)

---

### Requirement: Authenticated user can change their own password

The system SHALL provide `POST /api/auth/change-password` for any authenticated user. It verifies the current password, enforces complexity on the new password, replaces the hash, and clears the `must_change_password` flag in a single update.

**Request body:**
```json
{
  "current_password": "OldPass1!",
  "new_password": "NewPass2@"
}
```

**Success — 200 OK:**
```json
{ "message": "הסיסמה שונתה בהצלחה" }
```

#### Scenario: Wrong current password

- **WHEN** `current_password` does not match the stored hash
- **THEN** the response SHALL be HTTP 401 Unauthorized

#### Scenario: Weak new password

- **WHEN** `new_password` fails at least one complexity rule
- **THEN** the response SHALL be HTTP 422 Unprocessable Entity with a message describing the violated rule

#### Scenario: Successful password change

- **WHEN** `current_password` is correct and `new_password` passes complexity
- **THEN** the system SHALL store the new bcrypt hash (cost 12), set `must_change_password = false`, and return HTTP 200

#### Scenario: must_change_password clears after successful change

- **WHEN** a user with `must_change_password = true` successfully changes their password
- **THEN** subsequent login SHALL return `must_change_password: false` in the response body

#### Scenario: Unauthenticated request is rejected

- **WHEN** `POST /api/auth/change-password` is called without a valid session cookie
- **THEN** the response SHALL be HTTP 401 (global `authenticate` middleware blocks it before the handler runs)

---

## MODIFIED Requirements

### Requirement: Login rejects deactivated users (extends auth-backend spec — Section 4)

The login flow in `POST /api/auth/login` SHALL add an `is_active` check immediately after a successful bcrypt comparison. If `is_active` is `false`, the system SHALL not issue a session cookie and SHALL return HTTP 403.

#### Scenario: Deactivated user with correct credentials

- **WHEN** a deactivated user submits the correct email and password to `POST /api/auth/login`
- **THEN** the response SHALL be HTTP 403 with `code: "ACCOUNT_INACTIVE"` and `message: "החשבון אינו פעיל"`

#### Scenario: Active user login is unaffected (regression guard)

- **WHEN** an active user submits correct credentials
- **THEN** the response SHALL be HTTP 200 with the session cookie set (no change from existing behaviour)

#### Scenario: Deactivated user with wrong password

- **WHEN** a deactivated user submits an incorrect password
- **THEN** the response SHALL be HTTP 401 (the lockout/credential check runs first; the `is_active` check is not reached)

#### Scenario: Login response includes must_change_password flag

- **WHEN** an active user logs in with correct credentials
- **THEN** the HTTP 200 response body SHALL include `must_change_password: true` or `must_change_password: false` reflecting the current stored value; login is not blocked regardless of this flag's value
