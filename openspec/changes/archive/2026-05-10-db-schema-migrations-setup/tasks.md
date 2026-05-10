## 1. Knex Configuration

- [x] 1.1 Create `backend/knexfile.cjs` with `development`, `test`, and `production` environments all reading `DATABASE_URL` from env, pointing migrations to `./migrations` and seeds to `./seeds`

## 2. Core Entity Migration

- [x] 2.1 Create `backend/migrations/20260507130000_create_core_entity_tables.cjs` with `up`/`down` functions
- [x] 2.2 In `up`: create `users` table (id, email, password_hash, full_name, role enum, is_active, created_at, updated_at)
- [x] 2.3 In `up`: create `clients` table (id, name, is_active, created_at, updated_at)
- [x] 2.4 In `up`: create `projects` table (id, client_id FK→clients, name, is_active, created_at, updated_at)
- [x] 2.5 In `up`: create `tasks` table (id, project_id FK→projects, name, is_active, created_at, updated_at)
- [x] 2.6 In `up`: create `user_tasks` table (id, user_id FK→users, task_id FK→tasks, assigned_at, unique constraint on user_id+task_id)
- [x] 2.7 In `down`: drop all five tables in reverse order (user_tasks, tasks, projects, clients, users)

## 3. Reporting Tables Migration

- [x] 3.1 Create `backend/migrations/20260507131000_create_reporting_tables.cjs`
- [x] 3.2 In `up`: create `work_entries` table (id, user_id FK, task_id FK, date, start_time, end_time, location, description, created_at, updated_at)
- [x] 3.3 In `up`: create `absence_entries` table (id, user_id FK, type enum, start_date, end_date, is_partial bool, document_path, created_at, updated_at)
- [x] 3.4 In `up`: create `timer_state` table (id, user_id FK unique, task_id FK nullable, start_time, created_at)
- [x] 3.5 In `down`: drop timer_state, absence_entries, work_entries

## 4. Admin & Audit Tables Migration

- [x] 4.1 Create `backend/migrations/20260507132000_create_admin_audit_tables.cjs`
- [x] 4.2 In `up`: create `month_locks` table (id, year, month, locked_at, locked_by FK→users, unlocked_at nullable, unlocked_by FK→users nullable, unique on year+month)
- [x] 4.3 In `up`: create `audit_log` table (id, actor_id FK→users, target_user_id FK→users nullable, action, entity_type, entity_id, old_value jsonb nullable, new_value jsonb nullable, created_at)
- [x] 4.4 In `down`: drop audit_log, month_locks

## 5. Admin Seed

- [x] 5.1 Create `backend/seeds/01_admin_user.cjs` that inserts an admin user with email `admin@timewatch.local`, a bcrypt-hashed password, role `admin`, and `is_active: true` — skip insert if user already exists

## 6. Docker Compose Integration

- [x] 6.1 Add `command: sh -c "npx knex --knexfile knexfile.cjs migrate:latest && node src/index.js"` to the `backend` service in `docker-compose.yml`

## 7. Verification

- [ ] 7.1 Run `docker compose down -v && docker compose up --build` and confirm backend starts without errors
- [ ] 7.2 Run `docker compose exec db psql -U timewatch -c '\dt'` and confirm all 10 tables exist
- [ ] 7.3 Run `docker compose exec backend npm run seed` and confirm admin user is created
- [ ] 7.4 Run `docker compose down && docker compose up` (without `-v`) and confirm migrations are a no-op on the second start
