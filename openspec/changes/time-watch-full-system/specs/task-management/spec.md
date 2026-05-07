## ADDED Requirements

### Requirement: Admin manages tasks
The system SHALL allow admins to create, edit, and soft-delete (close) tasks. Each task belongs to a project and has a name and open/closed status.

#### Scenario: Admin creates a task via project screen
- **WHEN** an admin adds a task from within a project's detail screen
- **THEN** the task is created as open and appears in assignment lists

#### Scenario: Admin closes a task
- **WHEN** an admin marks a task as closed
- **THEN** the task no longer appears in assignment or reporting dropdowns; historical reports referencing it remain intact

### Requirement: Admin assigns users to tasks
The system SHALL allow admins to assign employees to specific tasks. Reporting permissions are driven by task assignment — users only see clients/projects/tasks they are assigned to.

#### Scenario: User assigned to a task
- **WHEN** an admin assigns a user to a task
- **THEN** the user sees that task's parent client and project in their reporting dropdowns

#### Scenario: User removed from a task
- **WHEN** an admin removes a user from a task
- **THEN** the task disappears from the user's reporting form; prior reports against that task are unaffected

#### Scenario: Report dropdown shows only assigned data
- **WHEN** an employee opens the daily report form
- **THEN** the client dropdown shows only clients that have at least one task assigned to them
