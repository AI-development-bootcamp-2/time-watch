## Why

The login page is the entry point for every authenticated user in the system, but currently exists only as a stub (`<div>Login Page</div>`). Without a real login screen and auth integration, no other feature can be tested or used end-to-end.

## What Changes

- Replace `LoginPage.jsx` stub with a fully-implemented RTL Hebrew login form
- Wire the `/login` route in `App.jsx` to the real `LoginPage` component
- Implement `POST /api/auth/login` API call with JWT token storage
- Add inline Hebrew error messages for 401, 423, and network failures
- Add loading/disabled state to prevent duplicate submissions
- Redirect authenticated users away from `/login` to `/`
- Redirect to `/` on successful login

## Capabilities

### New Capabilities

- `user-login`: Login page UI, form validation, API integration, success/error handling, auth redirect, and loading state

### Modified Capabilities

<!-- None — no existing spec-level requirements are changing -->

## Impact

- `frontend/src/features/auth/LoginPage.jsx` — full replacement of stub
- `frontend/src/App.jsx` — wire LoginPage component into `/login` route
- `frontend/src/features/auth/authSlice.js` — implement token storage (localStorage)
- No backend changes required
