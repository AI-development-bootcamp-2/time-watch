## ADDED Requirements

### Requirement: Admin manages clients
The system SHALL allow admins to create, edit, and soft-delete clients. Each client has a name and optional contact details.

#### Scenario: Admin creates a client
- **WHEN** an admin submits a client name (contact details optional)
- **THEN** the client is created as active and appears in project-creation dropdowns

#### Scenario: Admin deactivates a client
- **WHEN** an admin marks a client as inactive
- **THEN** the client no longer appears in new-report dropdowns; existing reports referencing it remain intact

#### Scenario: Admin reactivates a client
- **WHEN** an admin marks an inactive client as active
- **THEN** it reappears in dropdowns for new reports

### Requirement: Client deactivation does not auto-cascade
The system SHALL NOT automatically deactivate a client's projects and tasks when the client is deactivated. The admin must deactivate each entity level manually.

#### Scenario: Client deactivated, project still active
- **WHEN** a client is deactivated but its projects remain active
- **THEN** existing task assignments still exist but the client will not appear in new-report client dropdowns
