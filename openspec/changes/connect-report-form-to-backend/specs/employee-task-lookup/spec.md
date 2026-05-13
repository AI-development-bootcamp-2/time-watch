## ADDED Requirements

### Requirement: Auth middleware accepts both cookie and Authorization header
The `authenticate` middleware SHALL extract the JWT from `req.cookies.token` first; if absent, it SHALL fall back to the `Authorization: Bearer <token>` header. Both paths MUST use the same `verifyToken` call and produce the same `req.user` shape.

#### Scenario: Cookie token authenticated
- **WHEN** a request arrives with a valid JWT in the `token` cookie
- **THEN** the middleware sets `req.user` and calls `next()`

#### Scenario: Bearer header token authenticated
- **WHEN** a request arrives with no cookie but a valid `Authorization: Bearer <token>` header
- **THEN** the middleware sets `req.user` and calls `next()`

#### Scenario: Cookie takes priority over header
- **WHEN** a request arrives with both a valid cookie token and a valid header token
- **THEN** the cookie token is used (first-wins)

#### Scenario: No token provided
- **WHEN** a request arrives with neither a cookie nor an Authorization header
- **THEN** the middleware calls `next(UnauthorizedError)`

### Requirement: Employee can fetch their assigned tasks
The system SHALL expose `GET /api/tasks/mine` requiring only the `authenticate` middleware (no admin role). It MUST return all tasks assigned to the current user via the `user_tasks` table where `user_tasks.deleted_at IS NULL` and `tasks.deleted_at IS NULL`. Only tasks with `status = 'open'` SHALL be returned.

#### Scenario: Employee with assignments
- **WHEN** an authenticated employee calls `GET /api/tasks/mine`
- **THEN** the response is 200 with a JSON array of objects each containing `task_id`, `task_name`, `project_id`, `project_name`, `client_id`, `client_name`

#### Scenario: Employee with no assignments
- **WHEN** an authenticated employee with no task assignments calls `GET /api/tasks/mine`
- **THEN** the response is 200 with an empty array `[]`

#### Scenario: Unauthenticated request rejected
- **WHEN** a request to `GET /api/tasks/mine` arrives without a valid token
- **THEN** the response is 401

#### Scenario: Admin routes remain protected
- **WHEN** an employee (non-admin) calls `GET /api/tasks`, `POST /api/tasks`, or `PUT /api/tasks/:id`
- **THEN** the response is 403
