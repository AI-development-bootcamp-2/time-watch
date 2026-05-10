## Context

The login page is the only entry point for all system users. Currently `LoginPage.jsx` is a stub and `App.jsx` renders `<div>Login</div>` directly — nothing is wired. `authSlice.js` exists as a placeholder with no implementation.

The frontend uses:
- React + react-router-dom v6 (`BrowserRouter`, `Routes`, `Route`)
- Plain CSS with global RTL (`direction: rtl`) already set in `index.css`
- No Redux store, no auth context, no token storage — all TBD

This change implements the minimum viable auth layer needed for the login page to work.

## Goals / Non-Goals

**Goals:**
- Render a functional Hebrew RTL login form at `/login`
- Call `POST /api/auth/login` and handle 200 / 401 / 423 / network error responses
- Store the JWT token from a 200 response in `localStorage`
- Redirect to `/` on success; redirect away from `/login` if already authenticated
- Disable the submit button and show a loading indicator during the API call

**Non-Goals:**
- No registration or password-reset flow
- No Redux integration (authSlice remains a stub for now)
- No session refresh or token expiry handling
- No backend changes

## Decisions

### Token storage: localStorage

**Decision:** Store JWT in `localStorage` under the key `authToken`.

**Alternatives considered:**
- `sessionStorage`: Clears on tab close — too aggressive for a work-reporting app where users stay logged in across sessions.
- `httpOnly cookie`: Ideal for XSS protection but requires backend cookie support not currently built.

**Rationale:** `localStorage` is the simplest path that matches the existing `authSlice.js` stub pattern and allows the rest of the app (future protected routes) to read the token synchronously.

---

### Auth state check: direct localStorage read

**Decision:** `LoginPage` reads `localStorage.getItem('authToken')` in a `useEffect` on mount and calls `navigate('/', { replace: true })` if a token exists.

**Alternatives considered:**
- React Context / `useAuth` hook: The right long-term solution, but overkill for a single page with no other consumers yet.
- Redux: `authSlice.js` is a stub — wiring the store just for this page adds unnecessary overhead.

**Rationale:** Keep it minimal. When protected routes are added in a future change, auth state can be promoted to context then.

---

### Error display: inline, above the submit button

**Decision:** A single `<p>` error element renders conditionally inside the form, styled in red. No modal or toast.

**Rationale:** Matches the design asset and is the standard Hebrew form-error pattern. Error clears on next submit attempt.

---

### CSS: co-located plain CSS file

**Decision:** `LoginPage.css` imported by `LoginPage.jsx`, using BEM-style class names.

**Rationale:** Matches the existing project styling approach (plain CSS). No new tooling required.

## Risks / Trade-offs

- **[Risk]** Token stored in `localStorage` is readable by JS → XSS risk. **Mitigation:** Acceptable for now; migrate to `httpOnly` cookie when backend session support is added.
- **[Risk]** No token validation on mount — any string in `localStorage` passes the auth check. **Mitigation:** The backend will reject invalid tokens on protected API calls; front-end guard is convenience only.

## Migration Plan

1. Replace `LoginPage.jsx` stub with full implementation
2. Add `LoginPage.css` alongside it
3. Update `App.jsx` to import and use `LoginPage`
4. No data migrations, no backend changes, no environment changes required
