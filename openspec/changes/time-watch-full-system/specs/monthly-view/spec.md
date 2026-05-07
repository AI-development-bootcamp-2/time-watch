## ADDED Requirements

### Requirement: Monthly calendar with day status
The system SHALL display a calendar view of the current month showing each day's reporting status: full (≥9h reported or absence), missing (work day with no report), or exceptional (partial hours / partial absence).

#### Scenario: Employee views monthly calendar
- **WHEN** an employee navigates to the monthly view
- **THEN** each work day cell shows one of three statuses with a colour or icon indicator

#### Scenario: Weekend and holiday days appear greyed and blocked
- **WHEN** the calendar renders a Friday, Saturday, or configured Jewish holiday
- **THEN** the cell is greyed and cannot be clicked to add a report

### Requirement: Clickable day entries for editing
Each calendar day with existing reports MUST be clickable and open the entry for editing (if the month is not locked).

#### Scenario: Employee clicks a reported day
- **WHEN** an employee clicks a day that has existing work entries
- **THEN** the entries are shown in an editable form

#### Scenario: Locked month entries are read-only
- **WHEN** an employee clicks a day in a locked month
- **THEN** the entries are shown in read-only mode with no save action

### Requirement: Detailed report list below calendar
Below the calendar the system SHALL show a list of all entries for the month with date, duration (from–to), client, project, task, and description.

#### Scenario: Employee scrolls report list
- **WHEN** an employee views the monthly screen
- **THEN** a scrollable list of all entries is shown beneath the calendar

### Requirement: Month navigation
The system SHALL allow employees to navigate to previous months.

#### Scenario: Navigate to previous month
- **WHEN** an employee clicks the previous-month button
- **THEN** the calendar and list update to show that month's data
