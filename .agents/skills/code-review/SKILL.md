---
name: code-review
description: ALWAYS use this skill when asked to review, check, audit, or improve code. Triggers on "review this", "is this correct?", "check for issues", "improve this code", or when code is pasted without a specific edit request.
---

## Review checklist

Run through all applicable categories for the code's layer.

### Security (highest priority — flag these first)
- [ ] SQL: parameterized queries only — no string interpolation with user input
- [ ] Auth: JWT verified on every protected route via `authenticate` middleware
- [ ] Admin routes: `requireAdmin` middleware present
- [ ] Input validation: express-validator runs before controller logic
- [ ] Sensitive data (passwords, tokens) never logged or returned in API responses
- [ ] File uploads: MIME type + size validated before saving

### Correctness
- [ ] Soft deletes: queries filter `deleted_at IS NULL`; deletions use `SET deleted_at = NOW()`
- [ ] Month lock respected: report mutations check `month_locks` before writing
- [ ] Business rules enforced server-side (not just client-side): end_time > start_time, valid absence types, etc.
- [ ] Transactions used for multi-step writes

### React / Frontend
- [ ] No direct DOM manipulation — state drives UI
- [ ] `useEffect` dependencies array correct (no stale closures)
- [ ] Error and loading states handled (not just happy path)
- [ ] RTL: `dir="rtl"` set on containers; no hardcoded `left`/`right` CSS that breaks RTL
- [ ] Mobile-first: base styles are mobile; desktop overrides via `sm:`/`md:` prefixes

### Node / Backend
- [ ] Async errors caught and passed to `next(err)`
- [ ] No business logic in route files — only wiring
- [ ] `db` pool connections released (`.release()` in `finally` block)

### Performance
- [ ] N+1 queries: loops that fire per-row queries should be rewritten as JOINs
- [ ] DB columns used in WHERE/JOIN have indexes
- [ ] No blocking synchronous operations in request handlers

## Output format

For each issue found:

```
[SEVERITY] Category — Description
  File: path/to/file.js:lineNumber
  Fix: what to do instead
```

Severities: `[CRITICAL]` (security/data loss) · `[HIGH]` (correctness bug) · `[MEDIUM]` (best practice) · `[LOW]` (style/minor)

End with a one-line summary: "X critical, Y high, Z medium issues found."

## Example

**Input:** controller that builds SQL with template literals using `req.body`

**Output:**
```
[CRITICAL] Security — SQL injection via string interpolation
  File: backend/controllers/reports.js:14
  Fix: replace `WHERE user_id = ${req.body.id}` with parameterized `WHERE user_id = $1` and pass `[req.body.id]` as the values array.

1 critical, 0 high, 0 medium issues found.
```
