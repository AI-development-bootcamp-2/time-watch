-- Initial schema migration
-- Tables: users, clients, projects, tasks, user_tasks,
--         work_entries, timer_state, absence_entries,
--         month_locks, audit_log

-- Users
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  full_name        VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  role             VARCHAR(20)  NOT NULL CHECK (role IN ('employee', 'project_manager', 'admin')),
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  failed_attempts  INT          NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  contact     VARCHAR(255),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  client_id   INT         NOT NULL REFERENCES clients(id),
  name        VARCHAR(255) NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  project_id  INT         NOT NULL REFERENCES projects(id),
  name        VARCHAR(255) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- User-Task assignments
CREATE TABLE IF NOT EXISTS user_tasks (
  user_id     INT NOT NULL REFERENCES users(id),
  task_id     INT NOT NULL REFERENCES tasks(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);

-- Work entries
CREATE TABLE IF NOT EXISTS work_entries (
  id           SERIAL PRIMARY KEY,
  user_id      INT         NOT NULL REFERENCES users(id),
  task_id      INT         NOT NULL REFERENCES tasks(id),
  date         DATE        NOT NULL,
  location     VARCHAR(20) NOT NULL CHECK (location IN ('משרד', 'לקוח', 'בית')),
  start_time   TIME        NOT NULL,
  end_time     TIME        NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Timer state (server-side timer)
CREATE TABLE IF NOT EXISTS timer_state (
  id          SERIAL PRIMARY KEY,
  user_id     INT         NOT NULL UNIQUE REFERENCES users(id),
  start_time  TIMESTAMPTZ NOT NULL,
  date        DATE        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Absence entries
CREATE TABLE IF NOT EXISTS absence_entries (
  id            SERIAL PRIMARY KEY,
  user_id       INT         NOT NULL REFERENCES users(id),
  type          VARCHAR(20) NOT NULL CHECK (type IN ('חופשה', 'מחלה', 'מילואים', 'אחר')),
  start_date    DATE        NOT NULL,
  end_date      DATE        NOT NULL,
  is_partial    BOOLEAN     NOT NULL DEFAULT FALSE,
  document_url  VARCHAR(500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_date >= start_date)
);

-- Month locks
CREATE TABLE IF NOT EXISTS month_locks (
  id         SERIAL PRIMARY KEY,
  year       INT         NOT NULL,
  month      INT         NOT NULL CHECK (month BETWEEN 1 AND 12),
  locked_by  INT         REFERENCES users(id),
  locked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (year, month)
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   INT          NOT NULL,
  changed_by  INT          NOT NULL REFERENCES users(id),
  changed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  field       VARCHAR(100) NOT NULL,
  old_value   TEXT,
  new_value   TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_entries_user_date    ON work_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_work_entries_task         ON work_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_absence_entries_user      ON absence_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity         ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_projects_client          ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project            ON tasks(project_id);
