## Context

The backend already has `knex` and `pg` installed and `backend/src/db/knex.js` already calls `runMigrations()`. The missing pieces are `knexfile.cjs` (deleted) and the migration files (deleted). `docker-compose.yml` passes `DATABASE_URL` to the backend container and already waits for Postgres to be healthy before starting the backend. The goal is to wire these together so schema creation is fully automatic.

## Goals / Non-Goals

**Goals:**
- `docker compose up` on a fresh machine creates all tables and seeds the admin user with zero manual steps
- Migrations are version-controlled and idempotent (safe to re-run)
- Schema covers every entity in the data model: users, clients, projects, tasks, user_tasks, work_entries, absence_entries, timer_state, month_locks, audit_log
- Rollback is possible via `knex migrate:rollback`

**Non-Goals:**
- Data seeding beyond the initial admin user (no demo data)
- ORM-style models — Knex is used only as query builder and migration runner
- Schema changes to existing data (this is a greenfield setup)

## Decisions

### 1. `knexfile.cjs` at `backend/` root (not inside `src/`)
Knex CLI looks for `knexfile.js/cjs` relative to where it's invoked. The `package.json` scripts already use `--knexfile knexfile.cjs`, so the file belongs at `backend/knexfile.cjs`. `src/db/knex.js` already imports it with `require('../../knexfile.cjs')` — no path changes needed.

### 2. CommonJS (`.cjs`) not ES Modules
The backend uses `require()` throughout. Knex migration files must match — using `.cjs` ensures Node doesn't try to interpret them as ESM.

### 3. Three migration files, split by concern
| File | Reason |
|------|--------|
| `*_create_core_entity_tables.cjs` | Users, clients, projects, tasks, user_tasks — the stable master-data layer |
| `*_create_reporting_tables.cjs` | Work entries, absences, timer state — operational data with FK deps on core |
| `*_create_admin_audit_tables.cjs` | Month locks, audit log — depend on both layers above |

Splitting by concern means a rollback of audit tables doesn't touch reporting data.

### 4. Run migrations via `docker-compose.yml` `command`, not in `index.js`
`src/db/knex.js` exports `runMigrations()` but calling it inside the app process couples migration failures to server crashes. Running it as a shell command before `node src/index.js` in docker-compose keeps concerns separate and makes the migration step visible in container logs.

```yaml
command: sh -c "npx knex --knexfile knexfile.cjs migrate:latest && node src/index.js"
```

Seeds are **not** run automatically in docker-compose — only migrations. Seed runs once manually or in CI setup, to avoid duplicate-key errors on restarts.

### 5. Soft deletes via `is_active` boolean, not `deleted_at` timestamp
The proposal requires soft deletes everywhere. Using a boolean `is_active DEFAULT true` is simpler to query and index than a nullable timestamp. All tables get this column.

## Risks / Trade-offs

- **Migration fails on startup → container exits**: Docker will restart the container (default policy). The underlying cause (bad SQL, unreachable DB) must be fixed in the migration file. → Mitigation: test migrations locally with `npm run migrate` before committing.
- **Seed re-run on restart causes duplicate error**: If seeds run on every `docker compose up` they will fail after the first run. → Mitigation: seeds are not in the docker-compose command; run manually with `npm run seed` once.
- **Schema drift if SQL files are kept**: The deleted `db/schema.sql` must stay deleted — keeping both creates a false source of truth. → Mitigation: PR checklist item to ensure old SQL files are gone.

## Migration Plan

1. Create `backend/knexfile.cjs`
2. Create the three migration files under `backend/migrations/`
3. Create `backend/seeds/01_admin_user.cjs`
4. Update `docker-compose.yml` backend `command`
5. Run `docker compose down -v && docker compose up --build` to verify clean-slate setup
6. Confirm tables exist: `docker compose exec db psql -U timewatch -c '\dt'`
