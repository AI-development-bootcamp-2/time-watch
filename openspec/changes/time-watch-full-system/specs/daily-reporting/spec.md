## ADDED Requirements

### Requirement: Manual daily hours entry
The system SHALL allow employees to manually enter one or more work entries per day. Each entry requires: date, work location (משרד/לקוח/בית), start time, end time, client, project, task, and description. All fields are mandatory.

#### Scenario: Successful entry submission
- **WHEN** an employee fills all required fields with valid values and submits
- **THEN** the entry is saved and the daily progress indicator updates

#### Scenario: Missing required field
- **WHEN** an employee submits without completing all required fields
- **THEN** each missing field is highlighted with a validation message

#### Scenario: End time before start time blocked
- **WHEN** an employee enters an end time earlier than the start time
- **THEN** the system displays an error and blocks submission

#### Scenario: Zero-duration entry blocked
- **WHEN** start time equals end time
- **THEN** the system displays an error and blocks submission

### Requirement: Future dates blocked
The system SHALL not allow employees to create work entries for dates in the future.

#### Scenario: Future date rejected
- **WHEN** an employee selects a date after today
- **THEN** the date picker disables future dates and the form cannot be submitted with a future date

### Requirement: Daily total hard-blocked above 24 hours
The system SHALL prevent an employee from submitting entries that would push the total reported hours for a single day above 24 hours.

#### Scenario: Over-24h submission blocked
- **WHEN** an employee attempts to submit an entry that would make the day's total exceed 24 hours
- **THEN** the system returns a hard-block error and does not save the entry

### Requirement: Over/under 9-hour soft alerts
The system SHALL display a non-blocking alert when the daily total deviates from the 9-hour standard.

#### Scenario: Under-9h alert
- **WHEN** an employee saves an entry and the day's total is less than 9 hours
- **THEN** a warning is shown indicating the shortfall (submission still allowed)

#### Scenario: Over-9h alert
- **WHEN** an employee saves an entry and the day's total exceeds 9 hours
- **THEN** a warning is shown indicating the overage (submission still allowed)

### Requirement: No midnight crossing for manual entries
Manual work entries MUST NOT span midnight. If a shift crosses midnight the employee must create two separate entries.

#### Scenario: Midnight-crossing entry blocked
- **WHEN** an employee sets an end time earlier than the start time (interpreted as crossing midnight)
- **THEN** the system returns an error explaining that shifts must be split at midnight

### Requirement: Multiple entries per day
The system SHALL allow employees to report multiple work entries on the same day (different clients, projects, or tasks).

#### Scenario: Second entry on same day
- **WHEN** an employee submits a second entry for today
- **THEN** it is saved alongside the first; the daily progress bar reflects the combined total

### Requirement: Cascading dropdowns for client/project/task
The client, project, and task dropdowns MUST filter based on the user's assignments and the preceding selection. If only one option exists it SHALL auto-select.

#### Scenario: Single client auto-selected
- **WHEN** an employee opens the report form and has tasks in only one client
- **THEN** the client field is pre-filled automatically

#### Scenario: Project list filtered by selected client
- **WHEN** an employee selects a client
- **THEN** the project dropdown shows only projects within that client where the employee has assigned tasks

### Requirement: Editing entries before month lock
The system SHALL allow employees to edit their own entries for any day in the current or previous open months.

#### Scenario: Employee edits a saved entry
- **WHEN** an employee clicks an existing entry and modifies its fields
- **THEN** the updated values are saved and confirmed

#### Scenario: Edit blocked on locked month
- **WHEN** an employee attempts to edit an entry in a locked month
- **THEN** the form is read-only and no save action is available
