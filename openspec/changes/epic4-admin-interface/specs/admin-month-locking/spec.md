## ADDED Requirements

### Requirement: Admin can manually lock a month
The system SHALL allow an admin to lock any month by inserting a record into `month_locks`. The lock SHALL be blocked if any employee has an active timer session for that month.

#### Scenario: Admin locks an unlocked month
- **WHEN** an admin submits `POST /api/month-locks` with a valid year and month, and no active timers exist for that month
- **THEN** the system inserts a lock record with `locked_by = <admin_id>`, `lock_source = 'manual'`, and a timestamp; returns 201

#### Scenario: Active timer blocks lock
- **WHEN** an admin attempts to lock a month and at least one employee has an active `timer_state` row for that month
- **THEN** the system returns 409 Conflict with a message listing the affected employees

#### Scenario: Locking an already-locked month
- **WHEN** an admin attempts to lock a month that is already locked
- **THEN** the system returns 409 Conflict

#### Scenario: Non-admin attempts to lock a month
- **WHEN** a non-admin calls `POST /api/month-locks`
- **THEN** the system returns 403 Forbidden

---

### Requirement: Admin can unlock a month
The system SHALL allow an admin to unlock a previously locked month by deleting the lock record. Unlocking applies to all employees for that month.

#### Scenario: Admin unlocks a locked month
- **WHEN** an admin calls `DELETE /api/month-locks/:id` for a valid lock record
- **THEN** the system deletes the lock record and returns 200; work entries and absence entries for that month become editable again

#### Scenario: Unlock a month that is not locked
- **WHEN** an admin attempts to unlock a month that has no lock record
- **THEN** the system returns 404 Not Found

---

### Requirement: All write endpoints enforce month lock
The system SHALL reject any `POST`, `PUT`, or `PATCH` request to `work_entries` or `absence_entries` if the targeted month is locked.

#### Scenario: Employee attempts to add a work entry to a locked month
- **WHEN** an employee submits a new work entry with a date in a locked month
- **THEN** the system returns 423 Locked

#### Scenario: Admin attempts to edit a work entry in a locked month via API
- **WHEN** an admin calls `PUT /api/work-entries/:id` for an entry in a locked month
- **THEN** the system returns 423 Locked

#### Scenario: Work entry in an unlocked month is not blocked
- **WHEN** an employee submits a work entry with a date in an unlocked month
- **THEN** the system processes the request normally

---

### Requirement: Auto-lock cron runs at midnight on the 1st of each month
The system SHALL run a `node-cron` job at 00:00 on the 1st of each month that inserts a lock record for the previous month with `locked_by = NULL` and `lock_source = 'auto'`.

#### Scenario: Auto-lock fires on the 1st with no active timers
- **WHEN** the cron fires on the 1st of the month and no active timers exist for the previous month
- **THEN** the system inserts an auto-lock record for the previous month; work entries for that month are now immutable

#### Scenario: Auto-lock fires with incomplete reports
- **WHEN** the cron fires and some employees have missing days in the previous month
- **THEN** the system logs a warning listing affected employees but proceeds to insert the lock record

#### Scenario: Auto-lock fires while a timer is active
- **WHEN** the cron fires and an employee has an active timer for the previous month
- **THEN** the system logs a warning, skips the lock for safety, and notifies the admin queue (or logs to `audit_log`)

---

### Requirement: Month locking UI shows status and lock/unlock controls
The system SHALL display a list of months with their lock status and provide Lock/Unlock buttons. A warning indicator SHALL appear if any employee has unreported days or an active timer in that month.

#### Scenario: Admin views month locking screen
- **WHEN** an admin opens the Month Locking screen
- **THEN** a list of months (at least the last 12) is shown, each with a lock status badge (Locked / Unlocked), the locker's name and timestamp if locked, and a Lock or Unlock button

#### Scenario: Lock button with active timer warning
- **WHEN** an admin hovers over or clicks the Lock button for a month that has active timers
- **THEN** the system shows a warning dialog listing affected employees before allowing confirmation

#### Scenario: Confirmation dialog before locking
- **WHEN** an admin clicks the Lock button
- **THEN** a confirmation dialog appears asking "Are you sure you want to lock [Month Year]?"; the lock proceeds only on confirmation
