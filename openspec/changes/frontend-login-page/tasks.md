# SCRUM-104

## 1. Wire Route and Component

- [x] 1.1 Import `LoginPage` in `App.jsx` and replace the inline `<div>Login</div>` with `<LoginPage />`

## 2. Build Login Form UI

- [x] 2.1 Replace the `LoginPage.jsx` stub with a form containing email input, password input, submit button ("התחבר"), and an error `<p>` element
- [x] 2.2 Create `LoginPage.css` with RTL-compatible styles: centered card layout, Hebrew typography, input borders/radius, button style, and red error text
- [x] 2.3 Add Hebrew labels: "דואר אלקטרוני" for email, "סיסמה" for password
- [x] 2.4 Verify the form renders correctly in RTL (right-aligned labels, inputs, and button)

## 3. Auth Redirect (already authenticated)

- [x] 3.1 Add a `useEffect` in `LoginPage` that reads `localStorage.getItem('authToken')` on mount and calls `navigate('/', { replace: true })` if a token is present

## 4. API Integration

- [x] 4.1 Add `useState` for `loading`, `error` fields in `LoginPage`
- [x] 4.2 Implement `handleSubmit`: clear error, set loading, call `POST /api/auth/login` with `{ email, password }`
- [x] 4.3 On HTTP 200: save the returned JWT to `localStorage` as `authToken`, then `navigate('/', { replace: true })`
- [x] 4.4 On HTTP 401: set error to `"האימייל או הסיסמה שגויים"`
- [x] 4.5 On HTTP 423: set error to `"החשבון ננעל עקב ניסיונות התחברות מרובים"`
- [x] 4.6 On network error (catch block, no response): set error to `"אירעה שגיאה. נסי שוב מאוחר יותר"`
- [x] 4.7 In `finally`: set loading to `false`

## 5. Loading and Submission Guard

- [x] 5.1 Bind `disabled={loading}` to the submit button
- [x] 5.2 Show a visual loading indicator on the button while `loading` is `true` (e.g., replace label text with "...")

## 6. Error Display

- [x] 6.1 Render the error `<p>` only when `error` is non-empty; apply red color via CSS class
- [x] 6.2 Confirm error clears at the start of each new submit (set `setError('')` before the API call)

# SCRUM-105

## 7. Auth Service

- [x] 7.1 Create `src/services/authService.js`
- [x] 7.2 Add `login({ email, password })`: calls `POST /api/auth/login`; on success returns parsed response body; on non-OK response throws an error with the HTTP status attached as `err.status`; network failures propagate as-is (no `.status`)
- [x] 7.3 Add `getCurrentUser()`: calls `GET /api/auth/me`; on 200 returns parsed response body; on any non-OK or network error throws (caller decides how to handle)
- [x] 7.4 Add `logout()`: calls `POST /api/auth/logout`; always resolves (swallow errors — AuthContext will clear state regardless)

## 8. AuthContext Setup

- [x] 8.1 Create `src/context/AuthContext.jsx`: define `AuthContext` with `createContext` and export it
- [x] 8.2 Define `AuthProvider` component holding `user` (object or null) and `isLoading` (bool, starts `true`) state
- [x] 8.3 Export a `useAuth()` custom hook that calls `useContext(AuthContext)` and throws if used outside the provider
- [x] 8.4 Expose `login(credentials)` method on context: calls `authService.login(credentials)`, sets `user` from the response body on success, throws on failure — LoginPage handles error display
- [x] 8.5 Expose `logout()` method on context: calls `authService.logout()`, then sets `user` to `null` regardless of outcome — does NOT call `navigate()`
- [x] 8.6 Wrap the router root with `<AuthProvider>` in `main.jsx`

## 9. Session Restore and Global Loading State

- [x] 9.1 On `AuthProvider` mount, call `authService.getCurrentUser()` to restore the session
- [x] 9.2 If `getCurrentUser()` resolves: set `user` from the response body
- [x] 9.3 If `getCurrentUser()` throws (401 or network error): set `user` to `null` (session expired or never existed)
- [x] 9.4 In the `finally` block of the restore call: set `isLoading` to `false` — this must always run so the app never stays stuck on the spinner
- [x] 9.5 While `isLoading` is `true`, render a full-page `<Spinner />` instead of any route content
- [x] 9.6 Create `src/components/Spinner.jsx`: centered animated spinner, CSS only
- [x] 9.7 Create `src/components/Spinner.css` with a rotating circle keyframe animation

## 10. Integrate AuthContext into LoginPage

- [x] 10.1 Remove the call to `login()` imported from the existing `authService.js` — LoginPage now calls `auth.login()` from context instead
- [x] 10.2 Replace the `useEffect` localStorage check in `LoginPage` with `if (auth.user) navigate('/', { replace: true })` — driven by context, not localStorage
- [x] 10.3 On successful login, `LoginPage` calls `await auth.login({ email, password })` and then navigates to `/`; error handling (`401`, `423`, network) remains in `LoginPage`
- [x] 10.4 Remove all direct `localStorage` reads and writes from `LoginPage`

## 11. ProtectedRoute

- [x] 11.1 Create `src/components/ProtectedRoute.jsx`: reads `auth.isLoading` and `auth.user` from `useAuth()`
- [x] 11.2 While `auth.isLoading` is `true`: render `null` (global spinner already shown — avoid double render)
- [x] 11.3 If `auth.user` is `null`: redirect to `/login` with `replace`
- [x] 11.4 Otherwise: render `<Outlet />`
- [x] 11.5 Wrap all authenticated routes in `App.jsx` with `<ProtectedRoute>` as a layout route

## 12. AdminRoute

- [x] 12.1 Create `src/components/AdminRoute.jsx`: reads `auth.user.role` from `useAuth()`; if role is not `'admin'`, redirects to `/` with `replace`; otherwise renders `<Outlet />`
- [x] 12.2 Nest `<AdminRoute>` inside `<ProtectedRoute>` in `App.jsx` for all `/admin/*` paths

## 13. Route Wiring in App.jsx

- [x] 13.1 Add a catch-all `<Route path="*" element={<Navigate to="/" replace />} />` for unknown paths
- [x] 13.2 Add a placeholder `/` route (inside `<ProtectedRoute>`) that renders a stub `<div>Home</div>` until the real employee home page is built
- [x] 13.3 Verify redirect chain: unauthenticated → any protected route → `/login`; authenticated non-admin → any admin route → `/`

## 14. Logout

- [x] 14.1 `auth.logout()` calls `authService.logout()` and then sets `user` to `null` — does NOT call `navigate()`
- [x] 14.2 If `authService.logout()` fails, still clear `user` — never leave the user stuck in a logged-in state
- [x] 14.3 Add a minimal logout button stub that: calls `await auth.logout()`, then calls `navigate('/login', { replace: true })`

## 15. Testing Scenarios

- [x] 15.1 Hard refresh on `/` while session is valid (`GET /api/auth/me` returns 200): spinner shows briefly, then home renders (no flicker to `/login`)
- [x] 15.2 Hard refresh on `/` while session is expired (`GET /api/auth/me` returns 401): redirects to `/login`
- [x] 15.3 Login with `admin@test.com` / `1234`: `POST /api/auth/login` succeeds, `auth.user` is populated, redirects to `/`
- [x] 15.4 Login with wrong credentials: `POST /api/auth/login` returns 401, inline Hebrew error shown, stays on `/login`
- [x] 15.5 Login with `locked@test.com`: returns 423, distinct Hebrew locked-account error shown, stays on `/login`
- [x] 15.6 Login with `network@test.com`: request fails with no response, generic Hebrew error shown, stays on `/login`
- [x] 15.7 Logout: `POST /api/auth/logout` called, `auth.user` is null, browser back button does not restore the session


# SCRUM-106

## 16. Base HTTP Client

- [x] 16.1 Create `src/services/apiClient.js`
- [x] 16.2 Read base URL from `import.meta.env.VITE_API_BASE_URL`; default to `''` (same origin) if the variable is not set
- [x] 16.3 Export a single `request(method, path, body)` function; prepend the base URL to every `path`
- [x] 16.4 Set `credentials: 'include'` on every request so cookies are sent cross-origin
- [x] 16.5 Set `Content-Type: application/json` only when `body` is provided
- [x] 16.6 On HTTP success: check `res.status === 204` first → return `null`; then check `content-type` header contains `application/json` → return `res.json()`; otherwise return `null` (do not rely on `Content-Length` — it may be absent)
- [x] 16.7 Never call `res.json()` unless the response has `content-type: application/json` — this prevents JSON parse errors on empty or non-JSON success responses
- [x] 16.8 On HTTP failure (`!res.ok`): throw `{ status: res.status, message: <text from response body or default string> }`
- [x] 16.9 In the `catch` block: first check if the caught error already has a numeric `status` property (i.e. it was thrown by the HTTP-failure branch inside the same `try`) — if so, rethrow it as-is so the original `{ status: 401, ... }` is never converted into a network error
- [x] 16.10 Only if the caught error does NOT have a `status` property (i.e. a genuine network-level failure such as `TypeError: Failed to fetch`): throw `{ status: 0, message: 'Network error' }` — this is the only case that becomes a status-0 error

## 17. Auth API Module

- [x] 17.1 Create `src/services/authApi.js`
- [x] 17.2 Import `request` from `./apiClient`
- [x] 17.3 Export `login(email, password)`: calls `request('POST', '/api/auth/login', { email, password })`
- [x] 17.4 Export `logout()`: calls `request('POST', '/api/auth/logout')`; always resolves (wrap in try/catch, swallow errors)
- [x] 17.5 Export `getMe()`: calls `request('GET', '/api/auth/me')`
- [x] 17.6 Each function lets the structured `{ status, message }` error from `apiClient` propagate to the caller — no error swallowing except in `logout()`

## 18. Refactor Auth Flow to Use authApi

- [x] 18.1 In `AuthContext.jsx`: replace the import of `getCurrentUser` from `authService` with `getMe` from `authApi`
- [x] 18.2 In `AuthContext.jsx`: replace the import of `login` from `authService` with `login` from `authApi`
- [x] 18.3 In `AuthContext.jsx`: replace the import of `logout` from `authService` with `logout` from `authApi`
- [x] 18.4 Update the session-restore `useEffect` to call `authApi.getMe()` instead of `getCurrentUser()`
- [x] 18.5 Update the context `login()` method to call `authApi.login(credentials.email, credentials.password)` and set `user` from the response
- [x] 18.6 Update the context `logout()` method to call `authApi.logout()` inside the `try` block; `finally` still sets `user` to `null`
- [x] 18.7 In `LoginPage.jsx`: confirm no direct `fetch` or `authService` imports remain — it must call only `auth.login()` from context
- [x] 18.8 Before deleting `src/services/authService.js`: search all files for imports of `authService` to confirm no references remain; update any remaining imports to use `authApi` first; only then delete the file
- [x] 18.9 Update `LoginPage.test.jsx` to mock `src/services/authApi` instead of `src/services/authService`; keep the same 7 test scenarios passing


# SCRUM-109

## 19. Auth Context — File Structure

- [x] 19.1 `AuthContext` (createContext) defined in `src/context/AuthProvider.jsx` and exported as a named export — separate `AuthContext.js` was skipped to avoid Vite `.js`-before-`.jsx` resolution collision
- [x] 19.2 Move `AuthProvider` into `src/context/AuthProvider.jsx`; imports `AuthContext` from the same file; all existing state and method logic preserved unchanged
- [x] 19.3 Move `useAuth` into `src/hooks/useAuth.js`; imports `AuthContext` from `../context/AuthProvider`; throws `'useAuth must be used inside AuthProvider'` if context is null
- [x] 19.4 `src/context/AuthContext.jsx` is now a two-line barrel — re-exports `AuthProvider` and `AuthContext` (default) from `./AuthProvider` and `useAuth` from `../hooks/useAuth`; all existing imports unchanged

## 20. AuthProvider — Behaviour

- [x] 20.1 `AuthProvider` holds `user` (null) and `isLoading` (starts `true`) state
- [x] 20.2 On mount: call `authApi.getMe()`; on resolve set `user` from the response; on any error set `user = null`; in `finally` set `isLoading = false` — this must always run
- [x] 20.3 `login(email, password)`: takes individual arguments (not an object); calls `authApi.login(email, password)`; sets `user` on success; rethrows on failure so the caller (LoginPage) handles error display and navigation
- [x] 20.4 `logout()`: calls `authApi.logout()` inside `try`; `finally` always sets `user = null` regardless of outcome; does NOT call `navigate()` — caller handles redirect

## 21. useAuth Hook

- [x] 21.1 `useAuth()` calls `useContext(AuthContext)` and throws a clear error message if the value is null (used outside provider)
- [x] 21.2 All components (`ProtectedRoute`, `AdminRoute`, `LogoutButton`, `LoginPage`) import `useAuth` and never read `AuthContext` directly

## 22. Update Callers After Signature Change

- [x] 22.1 In `LoginPage.jsx`: update the `onSubmit` callback passed to `useLoginForm` from `auth.login({ email, password })` to `auth.login(email, password)` (individual args)
- [x] 22.2 Confirmed no other call sites pass an object to `auth.login` — grep for `auth.login({` returned zero matches

## 23. Verification

- [x] 23.1 `<AuthProvider>` wraps the app root in `main.jsx`
- [x] 23.2 All 38 tests pass (15.1–15.7 in `LoginPage.test.jsx`, all `useLoginForm` and `validation` tests) — zero regressions
- [ ] 23.3 Confirm the login flow works end-to-end in the browser with the Docker dev server (mock or real backend)

# SCRUM-116
Before implementing, split this testing infrastructure task into small checklist tasks in tasks.md.

Feature requirements:

Testing setup:
- Install:
  - @testing-library/react
  - @testing-library/user-event
  - @testing-library/jest-dom

Testing utilities:
- Create renderWithAuth(ui, { user, isLoading }) helper
  - wraps components with mocked AuthContext.Provider
- Create renderWithRouter(ui) helper
  - wraps components with MemoryRouter

Mocking:
- Mock src/api/authApi.js globally
- No real HTTP requests during tests

Coverage goals:
- authApi: 90%
- useLoginForm: 90%
- AuthProvider: 85%
- LoginForm: 85%
- ProtectedRoute: 100%
- AdminRoute: 100%
- validation.js: 100%

Testing rules:
- All component tests must use renderWithAuth
- Prefer user interactions over implementation-detail testing
- Test behavior through the DOM as a real user would
- Avoid testing internal state or hook internals directly

Implementation instructions:
1. Create/update tasks.md with a small checklist
2. Implement only the first checklist item
3. Stop and wait for approval before continuing
4. Keep all existing tests passing
5. Do not refactor unrelated app logic
