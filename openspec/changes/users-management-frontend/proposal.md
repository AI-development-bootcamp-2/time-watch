## Why

The Admin Users Management backend API (Story 4.1) is complete and awaiting merge. Without a functional frontend, admins have no way to create, edit, or deactivate users through the application — they would need to call raw API endpoints directly. This change implements the full `UsersPage` and `UserModal` UI that connects to the existing backend, completing Story 4.1.

Additionally, the `/admin` route and the "ניהול" bottom-nav tab are currently accessible to all authenticated users. The `AdminRoute` guard component already exists in the codebase but is not wired into the router. This change wires it in and hides the admin nav item for non-admin users.

## What Changes

- Rename `UsersPage.tsx` stub to `UsersPage.jsx` and replace its content with a full desktop-RTL admin page: table with full name, email, role, and status-badge columns; active/inactive/all filter
- Create `UserModal.jsx` — add/edit modal with full-name, email, role dropdown, active toggle, and password field; complete client-side validation with Hebrew error messages
- Create `usersApi.js` service — wraps `GET /api/users`, `POST /api/users`, `PUT /api/users/:id`, `PATCH /api/users/:id/deactivate` using the existing `apiClient`
- Wire the existing `AdminRoute` guard into `App.tsx` so `/admin/*` redirects non-admins to `/`
- Conditionally render the "ניהול" bottom-nav tab in `Layout.tsx` only when `user.role === 'admin'`

## Capabilities

### New Capabilities

- `admin-users-page`: Admin can view, filter, add, and edit all system users from a dedicated management screen reachable via the admin sidebar
- `admin-user-modal`: Admin can create a new user or update an existing user (name, email, role, active status, password reset) via an inline modal with Hebrew validation feedback and inline API error display
- `admin-user-deactivate`: Admin can deactivate a user from the edit modal with last-admin guard error surfaced inline

### Modified Capabilities

- `admin-route-guard`: `/admin/*` routes now redirect unauthenticated users to `/login` and non-admin users to `/`; previously the routes were unprotected at the router level
- `admin-nav-visibility`: The "ניהול" bottom-nav tab in `Layout.tsx` is now shown only to users with `role === 'admin'`; non-admin users see no admin entry point

## Impact

- **Frontend**: `frontend/src/features/admin/UsersPage.jsx` (rename from `.tsx` + replace stub), new `frontend/src/features/admin/UserModal.jsx`, new `frontend/src/services/usersApi.js`, modified `frontend/src/App.tsx`, modified `frontend/src/components/Layout.tsx`
- **Backend**: No changes — the API contract is defined by the Admin User Management backend PR (Story 4.1); frontend can be developed and tested against mocked API responses in parallel with backend review
- **Database**: No changes
- **Dependencies**: No new npm packages required
