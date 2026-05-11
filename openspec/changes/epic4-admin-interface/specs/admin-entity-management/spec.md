## ADDED Requirements

### Requirement: Admin can manage clients
The system SHALL provide full CRUD (create, read, update, soft-delete) for clients. A client has a name (required) and optional contact info. Soft-delete sets `is_active = false`.

#### Scenario: Admin lists all clients
- **WHEN** an admin opens the Clients management screen
- **THEN** the system displays all clients (active and inactive) with name, contact, and status

#### Scenario: Admin creates a client
- **WHEN** an admin submits a valid client name
- **THEN** the system creates the client with `is_active = true` and returns 201

#### Scenario: Admin edits a client
- **WHEN** an admin modifies an existing client's name or contact
- **THEN** the system updates the record and returns 200

#### Scenario: Admin deactivates a client
- **WHEN** an admin toggles a client to inactive
- **THEN** the system sets `is_active = false`; the client no longer appears in employee reporting dropdowns

#### Scenario: Client with active children is deactivated
- **WHEN** an admin deactivates a client that still has active projects
- **THEN** the system shows a warning listing the count of active projects; the admin must manually deactivate child entities before the client disappears from employee dropdowns

---

### Requirement: Admin can manage projects
The system SHALL provide full CRUD for projects scoped to a client. A project has a name (required) and a client reference (required, active clients only). Soft-delete sets `is_active = false`.

#### Scenario: Admin lists projects
- **WHEN** an admin opens the Projects management screen
- **THEN** the system displays all projects grouped by client, with name and status

#### Scenario: Admin creates a project
- **WHEN** an admin selects an active client and submits a project name
- **THEN** the system creates the project with `is_active = true` under the selected client and returns 201

#### Scenario: Admin edits a project
- **WHEN** an admin modifies a project's name or client assignment
- **THEN** the system updates the record and returns 200

#### Scenario: Admin deactivates a project
- **WHEN** an admin toggles a project to inactive
- **THEN** the system sets `is_active = false`; the project no longer appears in employee reporting dropdowns

#### Scenario: Inactive client filtered from project creation dropdown
- **WHEN** an admin opens the project creation modal
- **THEN** only active clients appear in the client dropdown

---

### Requirement: Admin can manage tasks
The system SHALL provide full CRUD for tasks scoped to a project. A task has a name (required) and a project reference (required). Soft-delete sets `is_active = false` (displayed as "closed" in the UI).

#### Scenario: Admin lists tasks for a project
- **WHEN** an admin opens a project's detail screen
- **THEN** all tasks (open and closed) for that project are listed

#### Scenario: Admin creates a task
- **WHEN** an admin submits a task name under a project
- **THEN** the system creates the task with `is_active = true` and returns 201

#### Scenario: Admin edits a task
- **WHEN** an admin modifies a task's name
- **THEN** the system updates the record and returns 200

#### Scenario: Admin closes (deactivates) a task
- **WHEN** an admin marks a task as closed
- **THEN** the system sets `is_active = false`; the task no longer appears in employee reporting dropdowns and existing assignments are preserved but inactive

#### Scenario: Non-admin tries to manage entities
- **WHEN** a non-admin calls any client, project, or task write endpoint
- **THEN** the system returns 403 Forbidden
