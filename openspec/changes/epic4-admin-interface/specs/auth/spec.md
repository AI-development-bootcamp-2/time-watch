## MODIFIED Requirements

### Requirement: Role system includes Project Manager
The system SHALL support three user roles: Employee, Project Manager, and Admin. The Project Manager role SHALL be treated as a restricted sub-admin with access only to user-task assignment endpoints.

#### Scenario: Project manager authenticates and receives correct role in JWT
- **WHEN** a project manager logs in with valid credentials
- **THEN** the JWT payload contains `role: 'project-manager'`; the frontend renders the assignment management screen and no other admin screens

#### Scenario: Admin assigns project manager role during user creation
- **WHEN** an admin creates or edits a user and selects "Project Manager" as the role
- **THEN** the system stores `role = 'project-manager'` in the `users` table

#### Scenario: Project manager role guard allows assignment endpoints
- **WHEN** a project manager calls `POST /api/user-tasks` or `DELETE /api/user-tasks`
- **THEN** the system processes the request normally (200 or 201)

#### Scenario: Project manager role guard blocks all other admin endpoints
- **WHEN** a project manager calls any admin endpoint other than the assignment endpoints
- **THEN** the system returns 403 Forbidden

#### Scenario: Employee role guard unchanged
- **WHEN** an employee calls any admin or assignment endpoint
- **THEN** the system returns 403 Forbidden (no change from existing behaviour)
