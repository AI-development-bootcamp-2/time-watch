## ADDED Requirements

### Requirement: Admin manages projects
The system SHALL allow admins to create, edit, and soft-delete projects. Each project belongs to a client and has a name and active/inactive status.

#### Scenario: Admin creates a project
- **WHEN** an admin selects an active client and provides a project name
- **THEN** the project is created as active and can receive tasks

#### Scenario: Admin deactivates a project
- **WHEN** an admin marks a project as inactive
- **THEN** the project no longer appears in new-report dropdowns; historical reports referencing it remain intact

### Requirement: Project dropdown filtered by active clients
When creating a project, the client dropdown MUST show only active clients.

#### Scenario: Inactive client not selectable for new project
- **WHEN** an admin opens the new-project form
- **THEN** only active clients appear in the client selection dropdown
