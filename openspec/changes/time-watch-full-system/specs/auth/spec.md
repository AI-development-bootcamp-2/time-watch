## ADDED Requirements

### Requirement: Email and password login
The system SHALL authenticate users via email and password. Only admin-created accounts can log in. There is no self-registration flow.

#### Scenario: Successful login
- **WHEN** a user submits a valid email and correct password
- **THEN** the server issues a JWT stored in an httpOnly, SameSite=Strict cookie and redirects to the home screen

#### Scenario: Wrong password
- **WHEN** a user submits a valid email but incorrect password
- **THEN** the system increments the failed-attempt counter and returns an authentication error (no detail about which field is wrong)

#### Scenario: Account locked after 3 failed attempts
- **WHEN** a user's failed-attempt counter reaches 3
- **THEN** the account is locked and subsequent login attempts are rejected with a locked-account message

### Requirement: Password complexity rules
The system SHALL enforce minimum password requirements on every password set or reset event.

#### Scenario: Password meets requirements
- **WHEN** a password contains ≥8 characters with at least one uppercase letter, one lowercase letter, one digit, and one special character
- **THEN** the password is accepted and stored as a bcrypt hash

#### Scenario: Password too short
- **WHEN** a password is fewer than 8 characters
- **THEN** the system rejects it with a clear validation message listing all unmet requirements

### Requirement: Admin-only user creation
The system SHALL allow only admins to create new user accounts, including setting the initial password.

#### Scenario: Admin creates a new user
- **WHEN** an admin submits valid user details (full name, email, initial password, role)
- **THEN** the account is created as active and the user can log in immediately

#### Scenario: Non-admin attempts to create a user
- **WHEN** an employee or project manager calls the user-creation endpoint
- **THEN** the system returns 403 Forbidden

### Requirement: Session persistence via httpOnly cookie
The system SHALL store the JWT in an httpOnly cookie so that login state survives page refresh without exposing the token to JavaScript.

#### Scenario: Token survives page reload
- **WHEN** a logged-in user reloads the page
- **THEN** the browser sends the cookie automatically and the user remains authenticated

#### Scenario: Logout clears the cookie
- **WHEN** a user clicks logout
- **THEN** the server clears the JWT cookie and the user is redirected to the login screen
