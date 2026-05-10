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

- [ ] 5.1 Bind `disabled={loading}` to the submit button
- [ ] 5.2 Show a visual loading indicator on the button while `loading` is `true` (e.g., replace label text with "...")

## 6. Error Display

- [ ] 6.1 Render the error `<p>` only when `error` is non-empty; apply red color via CSS class
- [ ] 6.2 Confirm error clears at the start of each new submit (set `setError('')` before the API call)
