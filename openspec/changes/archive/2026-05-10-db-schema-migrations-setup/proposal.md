## Why

The project has no automated database setup — any developer who runs `docker compose up` gets a Postgres container with an empty database and a broken backend. We need Knex migrations that run automatically on container startup so the full schema is created consistently on any machine without manual SQL scripts.

## What Changes

- Add `backend/knexfile.cjs` — Knex config reading connection from `DATABASE_URL` env var (already set in docker-compose)
- Create `backend/migrations/` with three numbered `.cjs` files covering all tables: users, clients, projects, tasks, user_tasks, work_entries, absence_entries, timer_state, month_locks, audit_log
- Add `backend/seeds/01_admin_user.cjs` to seed the initial admin account
- Update `docker-compose.yml` backend `command` to run `knex migrate:latest` before starting the server
- Delete redundant raw SQL files (`db/schema.sql`, `db/migrations/*.sql`)

## Capabilities

### New Capabilities

- `db-migrations`: Knex-based migration system that automatically provisions the full PostgreSQL schema and seeds an initial admin user on every `docker compose up`

### Modified Capabilities

_(none)_

## Impact

- **backend/**: new `knexfile.cjs`, `migrations/`, `seeds/` — `knex` and `pg` already in `package.json`
- **docker-compose.yml**: backend `command` updated to run migrations before server
- **db/**: raw SQL files deleted; Knex migrations become the single source of truth
