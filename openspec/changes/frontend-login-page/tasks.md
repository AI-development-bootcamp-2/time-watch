###

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

- [ ] 11.1 Create `src/components/ProtectedRoute.jsx`: reads `auth.isLoading` and `auth.user` from `useAuth()`
- [ ] 11.2 While `auth.isLoading` is `true`: render `null` (global spinner already shown — avoid double render)
- [ ] 11.3 If `auth.user` is `null`: redirect to `/login` with `replace`
- [ ] 11.4 Otherwise: render `<Outlet />`
- [ ] 11.5 Wrap all authenticated routes in `App.jsx` with `<ProtectedRoute>` as a layout route

## 12. AdminRoute

- [ ] 12.1 Create `src/components/AdminRoute.jsx`: reads `auth.user.role` from `useAuth()`; if role is not `'admin'`, redirects to `/` with `replace`; otherwise renders `<Outlet />`
- [ ] 12.2 Nest `<AdminRoute>` inside `<ProtectedRoute>` in `App.jsx` for all `/admin/*` paths

## 13. Route Wiring in App.jsx

- [ ] 13.1 Add a catch-all `<Route path="*" element={<Navigate to="/" replace />} />` for unknown paths
- [ ] 13.2 Add a placeholder `/` route (inside `<ProtectedRoute>`) that renders a stub `<div>Home</div>` until the real employee home page is built
- [ ] 13.3 Verify redirect chain: unauthenticated → any protected route → `/login`; authenticated non-admin → any admin route → `/`

## 14. Logout

- [ ] 14.1 `auth.logout()` calls `authService.logout()` and then sets `user` to `null` — does NOT call `navigate()`
- [ ] 14.2 If `authService.logout()` fails, still clear `user` — never leave the user stuck in a logged-in state
- [ ] 14.3 Add a minimal logout button stub that: calls `await auth.logout()`, then calls `navigate('/login', { replace: true })`

## 15. Testing Scenarios

- [ ] 15.1 Hard refresh on `/` while session is valid (`GET /api/auth/me` returns 200): spinner shows briefly, then home renders (no flicker to `/login`)
- [ ] 15.2 Hard refresh on `/` while session is expired (`GET /api/auth/me` returns 401): redirects to `/login`
- [ ] 15.3 Login with `admin@test.com` / `1234`: `POST /api/auth/login` succeeds, `auth.user` is populated, redirects to `/`
- [ ] 15.4 Login with wrong credentials: `POST /api/auth/login` returns 401, inline Hebrew error shown, stays on `/login`
- [ ] 15.5 Login with `locked@test.com`: returns 423, distinct Hebrew locked-account error shown, stays on `/login`
- [ ] 15.6 Login with `network@test.com`: request fails with no response, generic Hebrew error shown, stays on `/login`
- [ ] 15.7 Logout: `POST /api/auth/logout` called, `auth.user` is null, browser back button does not restore the session
