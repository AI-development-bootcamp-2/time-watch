## ADDED Requirements

### Requirement: Server-side timer
The system SHALL maintain timer state on the server so that the timer continues to run if the browser is closed or the user navigates away.

#### Scenario: Timer persists after browser close
- **WHEN** an employee starts the timer and then closes the browser
- **THEN** on next login the timer is still shown as running with the correct elapsed time

#### Scenario: Only one active timer per user
- **WHEN** an employee attempts to start a second timer while one is already running
- **THEN** the system blocks the action and shows a message that a timer is already active

### Requirement: Timer start records start time
Clicking "התחל עבודה" SHALL record the current server timestamp as the timer start and display the running state prominently in the UI.

#### Scenario: Start timer
- **WHEN** an employee clicks the start button
- **THEN** the server saves `(user_id, start_time, date)` and the UI switches to running mode

### Requirement: Timer stop creates a work entry
Clicking "סיום עבודה" SHALL stop the timer and open a form to complete the work entry details (location, client, project, task, description). The duration is calculated server-side.

#### Scenario: Stop timer and complete report
- **WHEN** an employee clicks stop and fills in all required fields
- **THEN** a work entry is created with start and end times matching the timer; the timer state record is deleted

### Requirement: Timer auto-splits at midnight
If an active timer crosses midnight, the system SHALL automatically create a completed entry for day 1 (end 23:59) and start a new timer record for day 2 (start 00:00) via a server-side cron job.

#### Scenario: Timer crosses midnight
- **WHEN** a midnight cron job runs and finds an active timer from the previous day
- **THEN** a work entry is saved for day 1 with end time 23:59, and a new timer_state row is created for day 2 starting at 00:00

### Requirement: Abandoned timer saves start time only
If an employee never stops the timer, the system SHALL preserve the start time record but treat the entry as incomplete. At end-of-day the timer resets automatically.

#### Scenario: Timer never stopped
- **WHEN** the end-of-day reset runs and a timer has no stop event
- **THEN** only the start_time is retained in the record; no complete work entry is created
