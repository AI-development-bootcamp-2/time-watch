# Implementation Tasks — Admin Users Management Frontend (SCRUM-85)

> Build in the order listed. Write tests for each task before moving to the next.
> All user-facing strings must be in Hebrew. All components must use `dir="rtl"`.

---

## Prerequisite

The Admin User Management backend PR (Story 4.1) is awaiting review. Frontend development does **not** need to wait for it to merge. All four endpoints have a defined API contract:
- `GET /api/users` — returns array of user objects
- `POST /api/users` — already live (returns 201)
- `PUT /api/users/:id` — returns 200
- `PATCH /api/users/:id/deactivate` — returns 200 or 400 (last-admin guard)

Write all component and API-service tests against mocked responses. Integration-test against the real backend once the PR is merged.

---

## Task 1 — Create `usersApi.js` service

**File:** `frontend/src/services/usersApi.js`

- [ ] Create the file following the pattern in `frontend/src/services/authApi.js`
- [ ] Export `getUsers()` → `request('GET', '/api/users')`
- [ ] Export `createUser(data)` → `request('POST', '/api/users', data)`
- [ ] Export `updateUser(id, data)` → `request('PUT', `/api/users/${id}`, data)`
- [ ] Export `deactivateUser(id)` → `request('PATCH', `/api/users/${id}/deactivate`)`
- [ ] Write unit tests in `frontend/src/services/usersApi.test.js`:
  - Each function calls the correct HTTP method and path
  - `createUser` passes the body payload
  - `updateUser` interpolates the id into the URL

---

## Task 2 — Wire `AdminRoute` guard into `App.tsx`

**File:** `frontend/src/App.tsx`

Context: `AdminRoute` at `frontend/src/components/AdminRoute.jsx` already exists and checks `user.role !== 'admin'`, redirecting to `/`. It is NOT currently applied to the `/admin` route tree.

- [ ] Import `AdminRoute` in `App.tsx`
- [ ] Wrap the existing `<Route path="/admin" element={<AdminLayout />}>` with `AdminRoute` as an intermediate element, so the tree becomes:
  ```jsx
  <Route element={<AdminRoute />}>
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<Navigate to="users" replace />} />
      <Route path="users"    element={<UsersPage />} />
      <Route path="clients"  element={<ClientsPage />} />
      <Route path="projects" element={<ProjectsPage />} />
      <Route path="tasks"    element={<TasksPage />} />
      <Route path="reports"  element={<AdminReportsPage />} />
    </Route>
  </Route>
  ```
- [ ] Verify that the login redirect in `AdminRoute` goes to `/login` (not `/`)
- [ ] Write a smoke test confirming a non-admin `user` object triggers redirect to `/`

---

## Task 3 — Hide "ניהול" nav tab for non-admins in `Layout.tsx`

**File:** `frontend/src/components/Layout.tsx`

Context: The `NAV_ITEMS` array includes an `/admin` entry shown to all users. The `useAuth` hook provides `{ user }` with the current user's role.

- [ ] Import `useAuth` from `'../context/AuthContext'`
- [ ] After the existing `const navigate = useNavigate()` line, add:
  ```jsx
  const { user } = useAuth()
  ```
- [ ] Filter `NAV_ITEMS` before the `nav` render so the admin entry only appears when `user?.role === 'admin'`:
  ```jsx
  const visibleNavItems = NAV_ITEMS.filter(
    item => item.to !== '/admin' || user?.role === 'admin'
  )
  ```
- [ ] Replace the `NAV_ITEMS.map(...)` in the `<nav>` with `visibleNavItems.map(...)`
- [ ] Write a test: render `Layout` with a non-admin user — confirm the "ניהול" link is absent from the DOM

---

## Task 4 — Implement client-side validation helper

**File:** `frontend/src/features/admin/validateUserForm.js`

Context: Mirrors the validation pattern in `backend/src/utils/validate.js` and the form-level validation used in `frontend/src/features/auth/LoginForm.jsx`. Returns `{ valid, errors }` where `errors` is `{ [field]: string }`.

- [ ] Create `validateUserForm.js` with a named export `validateUserForm(fields, isCreate)`
  - `fields`: `{ full_name, email, role, password }`
  - `isCreate`: `boolean` — password is required only on create
- [ ] Validate `full_name`: required → `'שדה חובה'`
- [ ] Validate `email`: required → `'שדה חובה'`; format (RFC-style regex) → `'אימייל לא תקין'`
- [ ] Validate `password` when `isCreate === true` or when `password` is non-empty:
  - Required on create → `'שדה חובה'`
  - Complexity (≥8 chars, uppercase, lowercase, digit, special char) → `'הסיסמה חייבת לכלול: <list>'`
- [ ] Write unit tests covering all validation branches (valid/invalid for each field, create vs edit mode)

---

## Task 5 — Create `UserModal.jsx`

**File:** `frontend/src/features/admin/UserModal.jsx`

Context: Follow the modal shell pattern from `frontend/src/features/daily-reporting/StopTimerModal.tsx` and `frontend/src/features/monthly-view/EditEntryModal.tsx`. Use `InlineError` from `frontend/src/components/InlineError.jsx` for field-level errors. All text in Hebrew.

- [ ] Accept props: `user` (null = create mode, object = edit mode), `onClose()`, `onSaved()`
- [ ] Initialise local state from `user` prop (empty strings for create, populated for edit)
- [ ] Render modal shell: fixed overlay → centred white card with `dir="rtl"`, rounded-2xl shadow-xl, `max-w-sm`
  - Clicking the backdrop calls `onClose()`
  - Header: title ("משתמש חדש" / "עריכת משתמש") + close button (×)
- [ ] Render form fields:
  - שם מלא (text input, required)
  - אימייל (email input, required)
  - תפקיד (select: `employee` → "עובד", `admin` → "אדמין")
  - סיסמה (password input; placeholder "השאר ריק לאי-שינוי" in edit mode)
  - סטטוס (toggle or checkbox: "פעיל" / "לא פעיל"; defaults to active in create mode)
- [ ] On submit: run `validateUserForm` → set field errors and return early if invalid
- [ ] On valid submit: set `saving = true`, call `createUser` or `updateUser` from `usersApi.js`
  - In edit mode: build the payload **without** the `password` key when the password field is empty; only include `password` when the admin entered a non-empty value
  - On success: call `onSaved()`
  - On 409 error: set inline modal error `'כתובת האימייל כבר קיימת במערכת'`
  - On other API error: set inline modal error `'אירעה שגיאה. נסה שוב.'`
  - Always: set `saving = false`
- [ ] In edit mode only: render "השבת משתמש" button (visible only when `user.is_active === true`)
  - On click: call `deactivateUser(user.id)` from `usersApi.js`
  - On 400: display the API error message inline in the modal
  - On success: call `onSaved()`
- [ ] Disable the submit button and show "שומר..." while `saving === true`
- [ ] Write tests:
  - Renders with empty fields in create mode
  - Renders pre-filled fields in edit mode
  - Inline validation errors appear for empty required fields
  - Save button disabled during saving state
  - API 409 surfaces duplicate-email message
  - Deactivate button absent in create mode
  - Edit save with empty password field: `password` key is absent from the PUT request body
  - Edit save with non-empty password field: `password` key is present in the PUT request body

---

## Task 6 — Implement `UsersPage.jsx` (rename stub + replace content)

**File:** `frontend/src/features/admin/UsersPage.jsx`

Context: The current stub is `frontend/src/features/admin/UsersPage.tsx`. Rename it to `UsersPage.jsx`, update the import in `frontend/src/App.tsx` accordingly, then replace the stub content entirely. Follow the desktop RTL admin layout pattern — use Tailwind for spacing/layout; plain elements (no extra CSS file unless styling can't be expressed in Tailwind).

- [ ] On mount: call `getUsers()` from `usersApi.js`; set `users`, `loading`, and `loadError` state
- [ ] Render a loading spinner while fetching; render an inline error on `loadError`
- [ ] Render the filter bar: three buttons/tabs "הכל" | "פעיל" | "לא פעיל"; active filter highlighted (blue-600 pill, matching `AdminLayout` active tab style); filter applied client-side
- [ ] Render the "הוסף משתמש" button (top-left in RTL = visually top-right) that opens `UserModal` in create mode
- [ ] Render a `<table dir="rtl">` with columns:
  - שם מלא
  - אימייל
  - תפקיד (display in Hebrew: "עובד" / "אדמין")
  - סטטוס (badge: active = green pill "פעיל", inactive = grey pill "לא פעיל")
- [ ] Each row is clickable: clicking opens `UserModal` in edit mode with that user's data
- [ ] `UserModal` receives an `onSaved` callback that closes the modal and re-fetches the users list (call `getUsers()` again)
- [ ] Write tests:
  - Renders table rows after successful fetch
  - "פעיל" filter hides inactive rows
  - "לא פעיל" filter hides active rows
  - "הכל" filter shows all rows
  - Clicking "הוסף משתמש" opens modal in create mode (empty fields)
  - Clicking a row opens modal in edit mode (pre-filled fields)
  - Load error message renders when API fails

---

### Definition of Done — SCRUM-85

- [ ] `GET /api/users`, `POST /api/users`, `PUT /api/users/:id`, `PATCH /api/users/:id/deactivate` are all consumed via `usersApi.js`
- [ ] `/admin/users` is accessible to admins only; non-admins are redirected to `/`; unauthenticated users are redirected to `/login`
- [ ] "ניהול" bottom-nav tab is hidden for non-admin users
- [ ] `UsersPage` renders all users in a table with working status filter
- [ ] "הוסף משתמש" opens empty modal; row click opens pre-filled modal
- [ ] Client-side validation blocks submission with Hebrew per-field error messages for: empty required fields, invalid email format, weak/missing password
- [ ] API errors surface inline in the modal: duplicate email (409) and generic errors
- [ ] Deactivate button appears in edit modal; last-admin 400 error surfaces inline
- [ ] On save/deactivate success: modal closes and users list refreshes
- [ ] All new frontend code has Jest/Vitest tests; coverage for new files ≥ 60%
- [ ] No ESLint errors introduced
