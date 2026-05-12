## ADDED Requirements

### Requirement: Admin or project manager can assign employees to tasks
The system SHALL allow admins and project managers to assign employees to tasks by creating rows in `user_tasks`. The same endpoints SHALL allow removal of assignments.

#### Scenario: Admin assigns an employee to a task
- **WHEN** an admin submits `POST /api/user-tasks` with a valid `user_id` and `task_id`
- **THEN** the system creates the assignment and returns 201

#### Scenario: Admin removes an employee from a task
- **WHEN** an admin submits `DELETE /api/user-tasks` with a valid `user_id` and `task_id`
- **THEN** the system removes the assignment and returns 200

#### Scenario: Duplicate assignment attempt
- **WHEN** an admin submits an assignment that already exists
- **THEN** the system returns 409 Conflict (or 200 idempotently, implementation choice)

#### Scenario: Project manager assigns an employee
- **WHEN** an authenticated project manager submits a valid assignment
- **THEN** the system creates the assignment and returns 201

#### Scenario: Employee tries to call assignment endpoints
- **WHEN** an employee calls `POST /api/user-tasks` or `DELETE /api/user-tasks`
- **THEN** the system returns 403 Forbidden

---

### Requirement: Project manager receives 403 on all other admin endpoints
The system SHALL return 403 Forbidden to a project manager caller for every admin endpoint that is not an assignment endpoint.

#### Scenario: Project manager attempts to access user management
- **WHEN** a project manager calls any endpoint under `/api/users` (write or read)
- **THEN** the system returns 403 Forbidden

#### Scenario: Project manager attempts entity management
- **WHEN** a project manager calls any write endpoint for clients, projects, or tasks
- **THEN** the system returns 403 Forbidden

#### Scenario: Project manager attempts to lock a month
- **WHEN** a project manager calls `POST /api/month-locks`
- **THEN** the system returns 403 Forbidden

---

### Requirement: Assignment UI provides user-centric and task-centric views
The assignment screen SHALL offer two views: select a user to see their task checklist, or select a task to see the user checklist. Both views write to the same API.

#### Scenario: User-centric assignment view
- **WHEN** the admin selects a user from the user dropdown
- **THEN** the system displays a checklist of all tasks grouped by client/project, with currently assigned tasks pre-checked

#### Scenario: Task-centric assignment view
- **WHEN** the admin selects a task from the task dropdown
- **THEN** the system displays a checklist of all active employees, with currently assigned employees pre-checked

#### Scenario: Saving changes in either view
- **WHEN** the admin toggles checkboxes and clicks Save
- **THEN** the system sends the appropriate `POST` or `DELETE` calls to synchronise the `user_tasks` table
