## ADDED Requirements

### Requirement: ReportForm fetches assigned tasks on mount
When the ReportForm is rendered, it SHALL call `GET /api/tasks/mine` and build a `ClientGroup[]` structure (client → projects → tasks hierarchy) to populate the ProjectPicker. A loading state SHALL be shown while fetching. If the fetch fails, an error message SHALL be displayed.

#### Scenario: Tasks loaded successfully
- **WHEN** ReportForm mounts
- **THEN** `GET /api/tasks/mine` is called, and the returned flat rows are grouped into a `ClientGroup[]` array keyed by `client_id`

#### Scenario: No assigned tasks
- **WHEN** `GET /api/tasks/mine` returns an empty array
- **THEN** the ProjectPicker shows a "לא הוקצו לך משימות — פנה למנהל" message

#### Scenario: Fetch error
- **WHEN** `GET /api/tasks/mine` returns an error
- **THEN** an error message is displayed in the form

### Requirement: ProjectPicker supports 3-level drill-down selection
The ProjectPicker component SHALL display tasks organized in a 3-level hierarchy: client → project → task. The user MUST be able to drill down through clients and projects to reach and select a task. Back navigation SHALL be available at each level. When a task is selected, the picker SHALL call `onSelect(taskId, taskName, projectName)` and close.

#### Scenario: Client list shown first
- **WHEN** the picker opens
- **THEN** a list of client names is shown

#### Scenario: Drill into project list
- **WHEN** a client is tapped
- **THEN** the picker shows the projects belonging to that client

#### Scenario: Drill into task list
- **WHEN** a project is tapped
- **THEN** the picker shows the tasks belonging to that project

#### Scenario: Task selection
- **WHEN** a task is tapped
- **THEN** `onSelect(task.id, task.name, project.name)` is called and the picker closes

#### Scenario: Back navigation from tasks to projects
- **WHEN** the back button is pressed at the task level
- **THEN** the picker returns to the project list for the current client

#### Scenario: Back navigation from projects to clients
- **WHEN** the back button is pressed at the project level
- **THEN** the picker returns to the client list

#### Scenario: Search flattens hierarchy
- **WHEN** a search query is typed
- **THEN** the picker shows a flat list of tasks whose name, project name, or client name matches the query, bypassing the drill-down

### Requirement: ReportForm tracks taskId per row
Each project row in ReportForm SHALL store a `taskId: number | null` in addition to the display name strings. When a task is selected via the picker, both `task` (name) and `taskId` (integer) SHALL be set on the row. Validation SHALL fail if `taskId` is null (task not selected).

#### Scenario: Task selected via picker
- **WHEN** a task is selected in the ProjectPicker
- **THEN** the row's `task`, `taskId`, and `project` fields are all set

#### Scenario: Submit blocked without task
- **WHEN** the user attempts to submit with a row that has no task selected
- **THEN** a validation error is shown for that row

### Requirement: ReportForm submits work entries to the backend
On submit, ReportForm SHALL call `POST /api/work-entries` with `{ date: "YYYY-MM-DD", entries: [{ start_time, end_time, location, task_id, description }] }`. A saving state SHALL be shown during the request. On success, the form SHALL close and call the `onSave` prop if provided. On failure, an error message SHALL be displayed.

#### Scenario: Successful submission
- **WHEN** the form is valid and the user presses save
- **THEN** `POST /api/work-entries` is called with the correct payload, the form closes, and `onSave` is called

#### Scenario: API error on submit
- **WHEN** `POST /api/work-entries` returns an error
- **THEN** the form stays open and an error message is shown

#### Scenario: Date formatted correctly
- **WHEN** the form submits
- **THEN** the `date` field in the payload is in `YYYY-MM-DD` format using local time (not UTC)
