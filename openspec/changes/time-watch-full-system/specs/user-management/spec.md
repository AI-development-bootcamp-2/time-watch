## ADDED Requirements

### Requirement: Admin creates users
The system SHALL allow admins to create user accounts with full name, email, initial password, and role (employee / project-manager / admin).

#### Scenario: Successful user creation
- **WHEN** an admin submits all required fields with a valid password
- **THEN** the user is created as active and can log in with the initial password

#### Scenario: Duplicate email rejected
- **WHEN** an admin submits an email already registered in the system
- **THEN** the system returns a conflict error and does not create a duplicate account

### Requirement: Admin edits users
The system SHALL allow admins to update any user's full name, email, role, and active status, and to reset their password.

#### Scenario: Password reset by admin
- **WHEN** an admin sets a new password for a user
- **THEN** the new password is stored as a bcrypt hash and the user's failed-attempt counter is reset

#### Scenario: Role change
- **WHEN** an admin changes a user's role
- **THEN** the new role takes effect immediately on the user's next API call

### Requirement: Soft-delete users
The system SHALL deactivate (not permanently delete) users, preserving all historical report data.

#### Scenario: Admin deactivates a user
- **WHEN** an admin marks a user as inactive
- **THEN** the user cannot log in, but all their historical work and absence entries remain intact and visible to admins

#### Scenario: Last admin guard
- **WHEN** an admin attempts to deactivate their own account and they are the only active admin in the system
- **THEN** the system blocks the action with a clear error message

### Requirement: User list view
The system SHALL display a table of all users (active and inactive) with full name, email, role, and status.

#### Scenario: Admin views user list
- **WHEN** an admin navigates to user management
- **THEN** all users are displayed in the table including inactive ones
