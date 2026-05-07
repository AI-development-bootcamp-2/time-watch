## ADDED Requirements

### Requirement: Project manager can assign and remove users from projects
The system SHALL allow users with the project-manager role to add or remove employees from projects. This is the only admin-like action available to them.

#### Scenario: Project manager assigns a user to a project
- **WHEN** a project manager selects a user and a project and submits the assignment
- **THEN** the user is associated with the project and can report against its tasks

#### Scenario: Project manager removes a user from a project
- **WHEN** a project manager removes a user from a project
- **THEN** the user no longer sees that project's tasks in their report form (existing historical reports are unaffected)

### Requirement: Project manager cannot access other admin functions
The system SHALL block project managers from all admin endpoints except user-project assignment.

#### Scenario: Project manager attempts user management
- **WHEN** a project manager calls a user-creation, user-edit, client, or task endpoint
- **THEN** the system returns 403 Forbidden
