# SCRUM-84

## 1. [Backend] DB schema — must_change_password column

- [ ] 1.1 Write migration: `ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false`
- [ ] 1.2 Verify existing rows default to `must_change_password = false` after migration (guaranteed by `DEFAULT false`)
- [ ] 1.3 Confirm `findAll()` (§2.1) and `findById()` (§2.2) include `must_change_password` in their SELECT column list; update if either is missing

## 2. [Backend] Repository foundation — usersRepository.js

- [ ] 2.1 Add `findAll()` — SELECT id, full_name, email, role, is_active, must_change_password, created_at FROM users WHERE deleted_at IS NULL ORDER BY full_name ASC
- [ ] 2.2 Add `findById(id)` — SELECT all columns (including password_hash, needed by service-level auth checks) FROM users WHERE id = :id AND deleted_at IS NULL; return row or null
- [ ] 2.3 Add `update(id, patch)` — UPDATE users SET ... WHERE id = :id AND deleted_at IS NULL; return updated row
- [ ] 2.4 Add `lockUserForUpdate(id, trx)` — inside the provided Knex transaction issue `SELECT id, role, is_active FROM users WHERE id = :id AND deleted_at IS NULL FOR UPDATE`; return the row or null if not found
- [ ] 2.5 Add `lockActiveAdmins(trx)` — inside the provided Knex transaction issue `SELECT id FROM users WHERE role = 'admin' AND is_active = true AND deleted_at IS NULL FOR UPDATE`; return the array of locked rows (PostgreSQL does not support `FOR UPDATE` on aggregate queries — locking is achieved by selecting individual rows; counting happens in the service from the returned array length)
- [ ] 2.6 Add `setActiveTx(id, isActive, trx)` — `UPDATE users SET is_active = :isActive WHERE id = :id AND deleted_at IS NULL` inside the provided transaction; return the updated row
- [ ] 2.7 Add `updatePassword(userId, passwordHash)` — `UPDATE users SET password_hash = :passwordHash, must_change_password = false WHERE id = :userId AND deleted_at IS NULL`

## 3. [Backend] GET /api/users — list all users

- [ ] 3.1 Add `listUsers()` to `usersService.js` — delegates to `findAll()`; no additional business logic
- [ ] 3.2 Add `list` handler to `usersController.js` — calls service, returns 200 with array
- [ ] 3.3 Register `GET /` on `routes/users.js` under `requireRole('admin')`, mapped to `usersController.list`
- [ ] 3.4 Integration test: no cookie → 401
- [ ] 3.5 Integration test: employee JWT → 403
- [ ] 3.6 Integration test: admin JWT → 200 with array containing id, full_name, email, role, is_active
- [ ] 3.7 Integration test: response does NOT include password_hash, failed_attempts, or locked_until

## 4. [Backend] POST /api/users — create user (replace stub)

- [ ] 4.1 Add `createUser({ full_name, email, password, role })` to `usersService.js` — validate password complexity (≥8 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special); throw `ConflictError` on duplicate email; hash with bcrypt cost 12; insert row with `must_change_password = true`
- [ ] 4.2 Controller `create` handler — map `ConflictError` → 409 with `code: "EMAIL_CONFLICT"`, `ValidationError` (weak password) → 422 with rule description, success → 201 with sanitized user object
- [ ] 4.3 Verify `POST /` remains under `requireRole('admin')` after refactor
- [ ] 4.4 Unit test: valid payload → user created, password_hash stored, plain password absent from return value
- [ ] 4.5 Integration test: duplicate email → 409
- [ ] 4.6 Integration test: weak password (missing uppercase) → 422 with descriptive message
- [ ] 4.7 Integration test: admin JWT + valid body → 201 with user object (no password fields)
- [ ] 4.8 Integration test: admin-created user response includes `must_change_password: true`

## 5. [Backend] PUT /api/users/:id — update user

- [ ] 5.1 Add `updateUser(id, { full_name, email, role, password? })` to `usersService.js` — validate fields; if email changed check uniqueness against other users (409); if password provided validate complexity and re-hash; call `update()` (§2.3)
- [ ] 5.2 Add `update` handler to `usersController.js` — 404 if not found, 409 conflict, 422 weak password, 200 success
- [ ] 5.3 Register `PUT /:id` on `routes/users.js` under `requireRole('admin')`
- [ ] 5.4 Integration test: admin JWT + valid body → 200 with updated fields
- [ ] 5.5 Integration test: non-existent id → 404
- [ ] 5.6 Integration test: email already taken by another user → 409
- [ ] 5.7 Integration test: new password fails complexity → 422
- [ ] 5.8 Integration test: employee JWT → 403

## 6. [Backend] PATCH /api/users/:id/deactivate — soft deactivate (transactional)

- [ ] 6.1 Add `deactivateUser(id)` to `usersService.js` using a Knex transaction:
  - Begin a transaction (`knex.transaction(async trx => { ... })`)
  - Call `lockUserForUpdate(id, trx)` (§2.4); if null → rollback and throw `NotFoundError`
  - If `user.is_active === false` → commit and return current user (idempotent — no write needed)
  - If `user.role === 'admin'`: call `lockActiveAdmins(trx)` (§2.5); count `lockedRows.length` in service code; if count ≤ 1 → rollback and throw `BadRequestError("Cannot deactivate the last active admin")`
  - Call `setActiveTx(id, false, trx)` (§2.6) → commit and return updated row
- [ ] 6.2 Add `deactivate` handler to `usersController.js` — 400 for last-admin guard, 404 not found, 200 success
- [ ] 6.3 Register `PATCH /:id/deactivate` on `routes/users.js` under `requireRole('admin')`
- [ ] 6.4 Integration test: deactivate a regular employee → 200, is_active === false
- [ ] 6.5 Integration test: deactivate one of two active admins → 200
- [ ] 6.6 Integration test: deactivate the only remaining active admin → 400 with message "Cannot deactivate the last active admin"
- [ ] 6.7 Unit test: concurrency scenario — mock `lockUserForUpdate` to return an admin user and `lockActiveAdmins` to return an array of length 1; call `deactivateUser` → service throws `BadRequestError` and does NOT call `setActiveTx`
- [ ] 6.8 Unit test: verify that when the last-admin guard fires, the transaction is rolled back (mock `trx.rollback` or verify it is never committed)
- [ ] 6.9 Integration test: deactivate already-inactive user → 200 (idempotent, no UPDATE issued)
- [ ] 6.10 Integration test: employee JWT → 403
- [ ] 6.11 Integration test: non-existent user id → 404

## 7. [Backend] Login — inactive guard + must_change_password response

- [ ] 7.1 In `authService.js` login flow, after successful bcrypt match, check `user.is_active`; if false throw `ForbiddenError({ code: 'ACCOUNT_INACTIVE', message: 'החשבון אינו פעיל' })`
- [ ] 7.2 In `authController.js`, map the new `ForbiddenError` from login to HTTP 403
- [ ] 7.3 Update login success response in `authController.js` to include `must_change_password` from the user record
- [ ] 7.4 Integration test: deactivated user with correct credentials → 403 with code ACCOUNT_INACTIVE
- [ ] 7.5 Integration test: active user with correct credentials → 200 (regression guard)
- [ ] 7.6 Integration test: deactivated user with wrong password → 401 (lockout runs first; deactivation check is not reached)
- [ ] 7.7 Integration test: user with `must_change_password = true` logs in with correct credentials → 200 with `must_change_password: true` in response body (login is not blocked by this flag)
- [ ] 7.8 Integration test: user with `must_change_password = false` logs in → 200 with `must_change_password: false`

## 8. [Backend] POST /api/auth/change-password — forced password change

- [ ] 8.1 Add `changePassword(userId, { current_password, new_password })` to `authService.js`:
  - Fetch user by id via `findById` (§2.2)
  - Compare `current_password` against stored `password_hash` with `bcrypt.compare()`; throw `UnauthorizedError` on mismatch
  - Validate `new_password` complexity (≥8 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special); throw `ValidationError` if weak
  - Hash `new_password` with bcrypt cost 12
  - Call `updatePassword(userId, newHash)` (§2.7)
- [ ] 8.2 Add `changePassword` handler to `authController.js` — return 200 `{ message: 'הסיסמה שונתה בהצלחה' }` on success; map `UnauthorizedError` → 401, `ValidationError` → 422
- [ ] 8.3 Register `POST /api/auth/change-password` in `routes/auth.js` — no additional role guard; the global `authenticate` middleware already requires a valid session
- [ ] 8.4 Integration test: wrong `current_password` → 401
- [ ] 8.5 Integration test: `new_password` fails complexity → 422 with rule description
- [ ] 8.6 Integration test: valid request → 200; subsequent `findById` shows `must_change_password = false` and a different `password_hash`
- [ ] 8.7 Integration test: after successful change, login response body includes `must_change_password: false`
- [ ] 8.8 Integration test: unauthenticated request (no cookie) → 401 (global `authenticate` blocks it)

## 9. [Backend] Verification

- [ ] 9.1 Run `npm test` from `backend/` — all tests pass, no regressions
- [ ] 9.2 Confirm new-code coverage is ≥ 80% (check Jest output per-file)
- [ ] 9.3 Verify Swagger docs at `/api-docs` reflect all four user endpoints and `POST /api/auth/change-password` with request body, response schemas, and all error status examples
