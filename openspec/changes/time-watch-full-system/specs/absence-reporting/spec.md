## ADDED Requirements

### Requirement: Absence types
The system SHALL support exactly four fixed absence types: חופשה, מחלה, מילואים, אחר.

#### Scenario: Employee selects absence type
- **WHEN** an employee opens the absence form
- **THEN** the type dropdown shows exactly these four options

### Requirement: Single-day and date-range absence
The system SHALL allow absence reporting for a single date or a consecutive date range. Fridays and Saturdays are automatically excluded from the calculation.

#### Scenario: Date range excludes weekends
- **WHEN** an employee reports absence from Sunday to the following Thursday
- **THEN** the system counts only Sun–Thu work days, excluding Fri–Sat

#### Scenario: Absence spanning month boundary splits into two records
- **WHEN** an employee reports absence from April 28 to May 3
- **THEN** the system creates two absence records: one for April (28–30) and one for May (1–3)

### Requirement: Partial absence (half day)
The system SHALL allow marking an absence as a half day. A partial-absence day requires a complementary work hours entry for the remaining hours.

#### Scenario: Partial absence accepted with work entry
- **WHEN** an employee marks an absence as partial and has a work entry for the same day
- **THEN** both records coexist without conflict

### Requirement: Future absences for מחלה and מילואים only
Employees SHALL be allowed to create future-dated absence records only for מחלה and מילואים types.

#### Scenario: Future sick leave allowed
- **WHEN** an employee submits a מחלה absence for a future date
- **THEN** the record is saved

#### Scenario: Future חופשה blocked
- **WHEN** an employee submits a חופשה absence for a future date
- **THEN** the system returns an error

### Requirement: Document upload for מחלה and מילואים
The system SHALL require a supporting document for מחלה and מילואים absences. The document is a single file (PDF or image), max 20MB, and is replaceable.

#### Scenario: Sick leave submitted without document
- **WHEN** an employee submits a מחלה absence without attaching a document
- **THEN** the system warns that a document is required (blocking or non-blocking TBD per instructor)

#### Scenario: Employee replaces uploaded document
- **WHEN** an employee uploads a new document for an absence that already has one
- **THEN** the new file replaces the old one

#### Scenario: File exceeds 20MB
- **WHEN** an employee uploads a file larger than 20MB
- **THEN** the system rejects the upload with a clear size-limit error

### Requirement: Absence + existing work entry conflict
If an employee reports a full-day absence on a day that already has a work entry, the system SHALL warn and offer to replace the work entry.

#### Scenario: Full absence replaces existing work entry after confirmation
- **WHEN** an employee submits a full-day absence for a day with existing work hours and confirms the replacement
- **THEN** the work entry is removed and the absence is saved

#### Scenario: Cancel replacement
- **WHEN** an employee dismisses the replacement prompt
- **THEN** neither the absence nor the original work entry changes
