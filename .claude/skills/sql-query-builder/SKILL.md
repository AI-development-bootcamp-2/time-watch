---
name: sql-query-builder
description: ALWAYS use this skill when writing SQL queries for the PostgreSQL database. Triggers on any data access — SELECT, INSERT, UPDATE, DELETE — or when asked to design a table, migration, or query.
---

## Rules

- Always use parameterized queries (`$1, $2, ...`) — never interpolate user input into SQL strings
- Soft deletes: filter with `WHERE deleted_at IS NULL`; use `SET deleted_at = NOW()` instead of `DELETE`
- Use explicit column lists in SELECT — never `SELECT *` in production queries
- Wrap multi-step operations in a transaction (`BEGIN / COMMIT / ROLLBACK`)
- Add `RETURNING id, ...` after INSERT/UPDATE to avoid a second round-trip
- Prefer `TIMESTAMPTZ` for all timestamps

## Data model reference

```
users           id, full_name, email, password_hash, role, deleted_at
clients         id, name, deleted_at
projects        id, client_id, name, deleted_at
tasks           id, project_id, name, status, deleted_at
user_tasks      user_id, task_id (assignment table)
reports         id, user_id, task_id, date, location, start_time, end_time, description, created_at
month_locks     id, year, month, locked_by, locked_at
absences        id, user_id, type, start_date, end_date, is_partial, document_url, created_at
```

## Templates

**SELECT with join:**
```sql
SELECT r.id, r.date, r.start_time, r.end_time,
       t.name AS task_name, p.name AS project_name, c.name AS client_name
FROM reports r
JOIN tasks t ON t.id = r.task_id
JOIN projects p ON p.id = t.project_id
JOIN clients c ON c.id = p.client_id
WHERE r.user_id = $1
  AND r.date >= $2 AND r.date <= $3
ORDER BY r.date DESC;
```

**INSERT:**
```sql
INSERT INTO reports (user_id, task_id, date, location, start_time, end_time, description)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, date, start_time, end_time;
```

**Soft delete:**
```sql
UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL
RETURNING id;
```

**Transaction:**
```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...', [...]);
  await client.query('UPDATE ...', [...]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

## Example

**Input:** "query to get all reports for a user in a given month, with task/project/client names"

**Output:** parameterized SELECT joining `reports → tasks → projects → clients`, filtered by `user_id = $1`, `EXTRACT(YEAR FROM date) = $2`, `EXTRACT(MONTH FROM date) = $3`, ordered by date.
