## ADDED Requirements

### Requirement: Admin can list all users
The system SHALL provide an admin-only endpoint and UI screen that returns all users (active and inactive), including their name, email, role, and active status.

#### Scenario: Admin views users list
- **WHEN** an authenticated admin navigates to the Users management screen
- **THEN** the system displays a table of all users with columns: full name, email, role, and active/inactive status

#### Scenario: Admin filters by status
- **WHEN** the admin selects the "active" or "inactive" filter
- **THEN** the table shows only users matching the selected status

#### Scenario: Non-admin tries to access user list
- **WHEN** a non-admin (employee or project manager) calls `GET /api/users`
- **THEN** the system returns 403 Forbidden

---

### Requirement: Admin can create a new user
The system SHALL allow an admin to create a new user account with full name, email, role, and an initial password. The backend SHALL hash the password with bcrypt and enforce complexity rules (≥8 chars, upper, lower, digit, special character).

#### Scenario: Valid user creation
- **WHEN** an admin submits a valid create-user form (all fields present, password meets complexity)
- **THEN** the system creates the user, returns 201, and the new user appears in the users list

#### Scenario: Duplicate email
- **WHEN** an admin submits a create-user form with an email that already exists
- **THEN** the system returns 409 Conflict with a descriptive error message

#### Scenario: Password fails complexity rules
- **WHEN** an admin submits a password that does not meet complexity requirements
- **THEN** the system returns 422 with a specific message describing which rule was violated

---

### Requirement: Admin can edit an existing user
The system SHALL allow an admin to update a user's full name, email, role, and active status via an edit modal.

#### Scenario: Successful edit
- **WHEN** an admin submits valid changes to a user record
- **THEN** the system updates the record and returns 200

#### Scenario: Admin resets a user's password
- **WHEN** an admin provides a new password in the edit form
- **THEN** the system hashes the new password with bcrypt, replaces the stored hash, and returns 200

---

### Requirement: Admin can soft-deactivate a user with last-admin guard
The system SHALL allow an admin to deactivate a user account (setting `is_active = false`). The system SHALL block deactivation if the target user is the last active admin.

#### Scenario: Successful deactivation of a non-last-admin user
- **WHEN** an admin deactivates a user who is not the last active admin
- **THEN** the system sets `is_active = false` and returns 200; the deactivated user can no longer log in

#### Scenario: Attempt to deactivate last active admin
- **WHEN** an admin attempts to deactivate the only remaining active admin account
- **THEN** the system returns 400 with the message "Cannot deactivate the last active admin"

#### Scenario: Deactivated user attempts login
- **WHEN** a deactivated user submits valid credentials
- **THEN** the system returns 403 Forbidden

---

### Requirement: Admin UI shows add/edit modal
The system SHALL display an add/edit user modal with client-side validation before submitting to the API.

#### Scenario: Opening add modal
- **WHEN** the admin clicks the "Add User" button
- **THEN** an empty modal opens with fields: full name, email, role (dropdown), password, active toggle

#### Scenario: Opening edit modal
- **WHEN** the admin clicks on an existing user row
- **THEN** a pre-filled modal opens with the user's current data; password field is empty (only fill to reset)

#### Scenario: Client-side validation on submit
- **WHEN** the admin submits the modal with missing required fields or an invalid email format
- **THEN** inline error messages appear next to the invalid fields and the form is not submitted
