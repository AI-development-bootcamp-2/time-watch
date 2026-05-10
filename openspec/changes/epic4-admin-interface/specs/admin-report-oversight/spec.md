## ADDED Requirements

### Requirement: Admin can view any employee's monthly work entries
The system SHALL allow an admin to select any employee and any month to view their full list of work entries, using the same data structure as the employee's own monthly view.

#### Scenario: Admin selects employee and month
- **WHEN** an admin selects a user and a month (YYYY-MM) on the Report Oversight screen
- **THEN** the system returns and displays all work entries for that user in that month, including per-day totals and day status (full / missing / exceptional)

#### Scenario: Admin views locked month entries
- **WHEN** the selected month is locked
- **THEN** all entries are displayed in read-only mode; no edit or delete controls are shown

#### Scenario: Non-admin tries to access another employee's reports
- **WHEN** an employee calls `GET /api/work-entries?userId=<other_id>`
- **THEN** the system returns 403 Forbidden

---

### Requirement: Admin can edit any employee's work entry
The system SHALL allow an admin to open any work entry in an editable form and submit changes. The backend SHALL write an audit log record on every successful admin edit.

#### Scenario: Admin edits a work entry in an unlocked month
- **WHEN** an admin submits changes to an employee's work entry in an unlocked month
- **THEN** the system updates the entry via `PUT /api/work-entries/:id` and inserts a record into `audit_log` with the admin's user ID, the entry ID, old values, new values, and a timestamp

#### Scenario: Admin attempts to edit an entry in a locked month
- **WHEN** an admin opens a work entry in a locked month
- **THEN** the entry is displayed in read-only mode and the save button is not available; no 423 error is thrown on the frontend because the form blocks submission

#### Scenario: Audit log record is atomic with the edit
- **WHEN** the audit log insert fails
- **THEN** the entire transaction rolls back and the work entry is not updated; the system returns 500 Internal Server Error

---

### Requirement: Audit log captures all admin edits
The system SHALL maintain an `audit_log` table with one record per admin edit of an employee work entry, including: admin user ID, target entry ID, employee user ID, changed fields (before/after), and timestamp.

#### Scenario: Audit log entry created on edit
- **WHEN** an admin successfully edits a work entry
- **THEN** a row is inserted into `audit_log` with all required fields populated

#### Scenario: Employee edits own entry
- **WHEN** an employee edits their own work entry in an unlocked month
- **THEN** no audit log record is created (audit is admin-only)
