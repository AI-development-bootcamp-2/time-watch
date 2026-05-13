## Why

The admin panel requires a fully functional user management API. Currently only `POST /api/users` has a partial scaffold; the `GET`, `PUT`, and `PATCH /deactivate` endpoints are missing entirely. Without them an admin cannot list users, edit profiles, or deactivate accounts — blocking the Admin CRUD sprint. Additionally, the login controller does not yet enforce the `is_active` guard, meaning a deactivated user can still obtain a valid session cookie.

## What Changes

- Implement `GET /api/users` — returns all non-deleted users (active and inactive) for admin callers; 403 for non-admins.
- Implement `POST /api/users` — creates a user with full validation; 409 on duplicate email, 422 on weak password (replaces existing stub).
- Implement `PUT /api/users/:id` — updates full name, email, role, and optionally resets the password hash.
- Implement `PATCH /api/users/:id/deactivate` — soft-deactivates a user; 400 when the target is the last active admin.
- Extend `POST /api/auth/login` — after a successful bcrypt match, check `is_active`; return 403 (`ACCOUNT_INACTIVE`) for deactivated users.
- Add unit and integration tests for all new logic; achieve ≥ 80% coverage on new code.

## Capabilities

### New Capabilities

- `admin-users-management`: Contract for the four user-management endpoints — request/response shapes, validation rules, role guards, last-admin guard, and deactivated-user login rejection.

### Modified Capabilities

- `auth-backend` (login flow) — extended with an `is_active` check after the bcrypt match, returning 403 (`ACCOUNT_INACTIVE`) instead of issuing a session cookie.

## Impact

- **`backend/src/controllers/usersController.js`** — add `list`, `update`, `deactivate` handlers; replace stub `create` with full implementation.
- **`backend/src/services/usersService.js`** — add `listUsers`, `updateUser`, `deactivateUser` (with last-admin guard) business logic.
- **`backend/src/repositories/usersRepository.js`** — add `findAll`, `findById`, `update`, `setActive`, `countActiveAdmins` DB queries.
- **`backend/src/routes/users.js`** — register `GET /`, `PUT /:id`, `PATCH /:id/deactivate` under `requireRole('admin')`.
- **`backend/src/services/authService.js`** — insert `is_active` check in the login flow after bcrypt match.
- **`backend/src/__tests__/users.routes.test.js`** — extend with all new endpoint cases.
- **`backend/src/__tests__/usersService.test.js`** — new unit tests for service layer including last-admin concurrency scenario.
- No DB schema changes required (`is_active` column already exists). No new npm dependencies.
