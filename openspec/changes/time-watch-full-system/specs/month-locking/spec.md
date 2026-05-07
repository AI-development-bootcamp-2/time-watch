## ADDED Requirements

### Requirement: Auto-lock on the 1st of each month
The system SHALL automatically lock the previous month at midnight on the 1st of each new month, regardless of whether all employees have completed their reports.

#### Scenario: Auto-lock fires at midnight on the 1st
- **WHEN** the server cron job runs at 00:00 on the 1st
- **THEN** a lock record is inserted for the previous month with timestamp and actor = "system"

#### Scenario: Auto-lock with incomplete reports shows warning
- **WHEN** auto-lock runs and some employees have unreported days
- **THEN** the lock still proceeds; a warning summary is generated for admin review

### Requirement: Admin manual lock and unlock
The system SHALL allow admins to manually lock or unlock any month. Lock scope is all employees for that month.

#### Scenario: Admin manually locks a month
- **WHEN** an admin clicks lock on a specific month
- **THEN** a lock record is saved with the admin's user ID and timestamp; all employees' entries for that month become read-only

#### Scenario: Admin unlocks a month
- **WHEN** an admin clicks unlock on a locked month
- **THEN** the lock record is removed and all employees' entries for that month become editable again

### Requirement: Running timer blocks manual lock
An admin SHALL NOT be able to lock a month if any employee has an active running timer for that month.

#### Scenario: Lock blocked by active timer
- **WHEN** an admin attempts to lock a month where an employee has a running timer
- **THEN** the system returns an error identifying the employee with the active timer

### Requirement: Locked month is fully immutable
Once a month is locked, no changes SHALL be permitted to any data in that month — including work entries, absence entries, and document uploads.

#### Scenario: Employee attempts to add entry to locked month
- **WHEN** an employee submits a work entry for a date in a locked month
- **THEN** the system returns a locked-month error and does not save the entry

#### Scenario: Document upload blocked on locked month
- **WHEN** a user attempts to upload a document for an absence in a locked month
- **THEN** the system returns a locked-month error

### Requirement: Lock audit trail
The system SHALL record who locked or unlocked each month and when.

#### Scenario: Lock event recorded
- **WHEN** a month is locked (manually or automatically)
- **THEN** the month_locks table records: year, month, locked_by (user_id or "system"), locked_at timestamp
