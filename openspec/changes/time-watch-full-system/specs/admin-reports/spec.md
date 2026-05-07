## ADDED Requirements

### Requirement: Admin views any employee's reports
The system SHALL allow admins to view work and absence entries for any employee, filtered by month.

#### Scenario: Admin selects an employee and month
- **WHEN** an admin navigates to employee reports and selects a user and a month
- **THEN** all work and absence entries for that user and month are displayed

### Requirement: Admin edits employee reports
The system SHALL allow admins to edit any employee's work entries in non-locked months. Every admin edit MUST be recorded in the audit log.

#### Scenario: Admin edits a work entry
- **WHEN** an admin modifies a field in an employee's work entry and saves
- **THEN** the change is persisted and an audit record is created with: changed-by, changed-at, field changed, old value, new value

#### Scenario: Admin cannot edit locked-month reports
- **WHEN** an admin attempts to edit a work entry in a locked month
- **THEN** the form is read-only and no save action is available
