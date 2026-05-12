## ADDED Requirements

### Requirement: Automatic schema creation on container start
The system SHALL run all pending Knex migrations automatically when the backend Docker container starts, before the HTTP server accepts requests. The migrations MUST be idempotent — re-running them on an already-provisioned database SHALL be a no-op.

#### Scenario: Fresh database on first docker compose up
- **WHEN** a developer runs `docker compose up` on a machine with no existing database volume
- **THEN** all tables are created in Postgres and the backend server starts successfully

#### Scenario: Re-running compose on existing database
- **WHEN** a developer runs `docker compose up` on a machine that already has the database volume
- **THEN** Knex detects no pending migrations and the server starts without error or data loss

#### Scenario: Migration failure blocks server start
- **WHEN** a migration file contains an error (e.g. duplicate column)
- **THEN** the container exits with a non-zero code and the HTTP server does NOT start

### Requirement: Full schema coverage
The migrations SHALL create the following tables with appropriate columns, primary keys, foreign keys, and soft-delete support (`is_active` boolean):

- `users` (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
- `clients` (id, name, is_active, created_at, updated_at)
- `projects` (id, client_id FK, name, is_active, created_at, updated_at)
- `tasks` (id, project_id FK, name, is_active, created_at, updated_at)
- `user_tasks` (id, user_id FK, task_id FK, assigned_at)
- `work_entries` (id, user_id FK, task_id FK, date, start_time, end_time, location, description, created_at, updated_at)
- `absence_entries` (id, user_id FK, type, start_date, end_date, is_partial, document_path, created_at, updated_at)
- `timer_state` (id, user_id FK unique, start_time, task_id FK, created_at)
- `month_locks` (id, year, month, locked_at, locked_by FK, unlocked_at, unlocked_by FK)
- `audit_log` (id, actor_id FK, target_user_id FK, action, entity_type, entity_id, old_value, new_value, created_at)

#### Scenario: All tables exist after migration
- **WHEN** migrations complete on a fresh database
- **THEN** all ten tables listed above are present in the `timewatch` database

### Requirement: Initial admin seed
The system SHALL provide a seed file that inserts one admin user so the application is usable immediately after setup.

#### Scenario: Admin user exists after seed
- **WHEN** `npm run seed` is executed after migrations
- **THEN** a user with role `admin` exists in the `users` table with a bcrypt-hashed password
