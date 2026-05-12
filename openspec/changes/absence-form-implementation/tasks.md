# Implementation Tasks — Absence Form (Frontend + Backend)

> Build in the order listed. Write tests for each task before moving to the next.

---

## Backend

### Story B.1 — Auth Middleware

_Required by all absence routes._

#### Task B.1.1 — `authenticate` middleware
- [x] Create `src/middleware/auth.js`.
Read JWT from `req.cookies.token`, verify with `jsonwebtoken`, attach decoded payload to `req.user`.
Return `401` if cookie is missing or token is expired/invalid.

#### Task B.1.2 — `requireRole` middleware
- [x] Export `requireRole(...roles)` from `src/middleware/auth.js`.
Return `403` if `req.user.role` is not in the provided list.
Apply to admin-only routes.

#### Task B.1.3 — Register routes in `app.js`
- [x] Import and mount the absences router:
```js
const absencesRouter = require('./routes/absences')
app.use('/api/absences', authenticate, absencesRouter)
```

---

### Story B.2 — Absence Endpoints

_Implements Sub-task 2.3.1 from the full-system spec._

#### Task B.2.1 — `GET /api/absences`
- [x] Return absence entries for the authenticated user (`req.user.id`), excluding soft-deleted rows (`deleted_at IS NULL`).
Optional query param: `?month=YYYY-MM` — filter by entries whose `start_date` or `end_date` falls within that month.
Response: array of absence objects.

#### Task B.2.2 — `POST /api/absences`
- [x] Create a new absence entry. Server-side validations (in order):

1. `type` must be one of: `vacation`, `sick`, `military_reserve`, `other` → `400`
2. `start_date ≤ end_date` → `400`
3. Strip Fri (weekday 5) and Sat (weekday 6) from the date range. If zero working days remain → `400`
4. Future-date rule: only `sick` and `military_reserve` may have `start_date` in the future → `400` for others
5. `is_partial = true` requires `partial_hours` > 0 and < 9 → `400`
6. Check `month_locks` for every calendar month in the range → `423` (Locked) if any are locked
7. **Month-boundary auto-split**: if range spans multiple calendar months, insert only the portion that falls within the **current calendar month** (clip `end_date` to the last day of `start_date`'s month). Days in future months are silently dropped — not inserted, not errored. Return the single created record.

#### Task B.2.3 — `PUT /api/absences/:id`
- [x] Update an existing absence entry.
- Return `404` if not found or `deleted_at IS NOT NULL`
- Only the owner (`user_id = req.user.id`) or an admin may update → `403` otherwise
- Apply the same validations as `POST` (Task B.2.2)
- Check `month_locks` for the new date range → `423` if locked

#### Task B.2.4 — `POST /api/absences/:id/document`
- [x] Upload a supporting document using multer (`memoryStorage` — no disk I/O).
- Return `404` if absence not found or soft-deleted
- Accept only `application/pdf`, `image/jpeg`, `image/png` → `400` for other mime types
- Max file size: **20 MB** → `413` if exceeded
- Store `req.file.buffer` as `document_data` (bytea), `req.file.originalname` as `document_filename`, and `req.file.mimetype` as `document_mimetype` on the record
- If a document already exists, the new BLOB simply overwrites it in the same UPDATE — no file deletion needed
- Update `document_uploaded_at = NOW()` on the record
- Return updated absence object (excluding `document_data` from the JSON response)

#### Task B.2.4b — `GET /api/absences/:id/document`
- [x] Stream the stored BLOB back to the client.
- Return `404` if absence not found, soft-deleted, or has no document
- Set `Content-Type` to the stored `document_mimetype`
- Set `Content-Disposition: inline; filename="<document_filename>"`
- Send the raw `document_data` buffer

#### Task B.2.6 — `DELETE /api/absences/:id/document`
- [x] Delete the uploaded document for a given absence.
- Return `404` if absence not found, soft-deleted, or has no document (`document_data IS NULL`)
- Only the owner or an admin may delete → `403` otherwise
- Set `document_data = NULL`, `document_filename = NULL`, `document_mimetype = NULL`, and `document_uploaded_at = NULL` on the record
- Return updated absence object

#### Task B.2.5 — Tests (Jest + Supertest)
- [x] Integration tests using the real DB — no mocks except multer's in-memory buffer. Cover:
- `GET` with and without `?month=` filter; soft-deleted rows excluded; other user's rows excluded
- `POST` happy path (single month, multi-month split verified in DB)
- `POST` validation errors: bad type, future-date rule, Fri–Sat-only range, locked month
- `PUT` ownership guard, admin override, locked month block, 404 for missing record
- `POST /:id/document`: wrong mime type → 400, oversized → 413, success → `document_data` buffer persisted in DB, re-upload → BLOB overwritten, non-existent absence → 404
- `GET /:id/document`: streams BLOB with correct `Content-Type`; 404 when no document stored
- `DELETE /api/absences/:id/document`: success → all document columns nulled in DB; non-owner → 403; no document → 404; non-existent absence → 404

---

## Frontend

### Story F.1 — API Service Layer

#### Task F.1.1 — `absencesApi.js`
- [ ] Create `src/features/absences/absencesApi.js` with:
```js
getAbsences(params)           // GET /api/absences
createAbsence(data)           // POST /api/absences
updateAbsence(id, data)       // PUT /api/absences/:id
uploadDocument(id, file)      // POST /api/absences/:id/document  (multipart/form-data)
deleteDocument(id)            // DELETE /api/absences/:id/document
```
All calls use `fetch` with `credentials: 'include'`.
Throw an `Error` with the server's message on non-2xx responses.

---

### Story F.2 — Absence Form Component

_Implements Sub-task 2.3.2 from the full-system spec. File: `src/features/absences/AbsenceForm.jsx`._

#### Task F.2.1 — Type dropdown
- [ ] `<select>` field for absence type, RTL-aligned, required.
Options (Hebrew label → API value):
- חופשה → `vacation`
- חצי יום חופש → `half_vacation_day` (fixed 4.5 hours — no `partial_hours` input needed)
- מחלה → `sick`
- מילואים → `military_reserve`
- אחר → `other`

When `half_vacation_day` is selected:
- Force duration mode to **יום אחד** and hide the duration selector (only a single day makes sense).

Show inline error "שדה חובה" if empty on submit.

#### Task F.2.2 — Duration type selector + date inputs
- [ ] Radio group or `<select>` with two options: **יום אחד** / **מספר ימים**.

Use a date-picker component (e.g. `react-datepicker`) for all date fields — not a plain `<input type="date">`.

**יום אחד mode:**
- Show a single date-picker (`start_date`). Set `end_date = start_date` before submitting.

**מספר ימים mode:**
- Show two date-pickers: `start_date` and `end_date`.
- Show inline error if `end_date < start_date`.

**Shared rules (both modes):**
- Disable future dates unless type is `sick` or `military_reserve` (re-evaluate on type change).
- Cross-month validation: if `start_date` and `end_date` are in different calendar months, show a red inline error "לא ניתן לדווח טווח תאריכים שחוצה חודשים" and block submission.
- Below the date field(s), display a live counter: "**X ימי עבודה** (ללא שישי–שבת)" — recalculates on every date change, counting weekdays only (Mon–Thu + Sun). When type is `half_vacation_day`, always show **0.5 ימי עבודה** regardless of the selected date.


#### Task F.2.4 — Document upload field
- [ ] Shown only when type is `sick` or `military_reserve`.
`<input type="file" accept=".pdf,.jpg,.jpeg,.png">`.
- Display selected filename next to the input
- Client-side size check: if file > 20 MB show error "הקובץ גדול מדי (מקסימום 20MB)" without calling the API
- After the upload API call resolves, show a status line below the file name:
  - Success → "הקובץ עלה בהצלחה" (green)
  - Failure → "אירעה תקלה בטעינת הקובץ" (red) + allow the user to pick and upload a new file
- Next to the displayed filename, show a **delete button (×)**. Clicking it calls `DELETE /api/absences/:id/document`, removes the status line, and resets the input so a new file can be chosen.
- When editing an existing absence that already has a document, show the filename with the delete button and the "הקובץ עלה בהצלחה" status label; clicking delete clears it.

#### Task F.2.5 — Conflict warning modal
- [ ] Before calling the API on submit:
- Fetch `GET /api/work-entries?date=<start_date>` (and each date in range if needed) to detect existing work entries
- If any conflict found, show a modal: "קיים דיווח שעות ביום זה. האם להחליף?"
  - **החלף** → proceed with submit
  - **ביטול** → close modal, stay on form

#### Task F.2.6 — Form submission & error handling
- [ ] **General rule: any validation error anywhere in the form must block submission.** The submit button stays disabled (or the submit handler exits early) as long as any field has an error — client-side or returned from the API.

On submit:
1. Run client-side validation (Tasks F.2.1–F.2.4). If any error exists → stop, do not call the API.
2. Check conflict and show modal if needed (Task F.2.5). If user clicks ביטול → stop.
3. Call `createAbsence` or `updateAbsence`
4. If a file is selected, call `uploadDocument` with the returned absence `id`
5. On success: show success message "הדיווח נשמר בהצלחה" and reset the form
6. On API error: display the server error message inline above the submit button (e.g., locked month, future-date rule) and keep the form open for correction

---

### Story F.3 — Page & Routing

#### Task F.3.1 — `AbsencePage.jsx`
- [ ] Render `<AbsenceForm />` for new absences.
Accept optional route param `/:id` — if present, load the absence via `getAbsences` and pass data as `initialValues` prop to `<AbsenceForm />` for edit mode.
Show loading spinner while fetching.

**Page chrome:**
- **× button** — top-left corner. Navigates back (e.g. `navigate(-1)`) without saving. No confirmation dialog.
- **Bottom action bar** — two buttons, full-width on mobile, RTL order:
  - **שמירה** (primary) — submits the form (triggers F.2.6 submit flow).
  - **ביטול** (secondary) — same behaviour as the × button, navigates back without saving.

#### Task F.3.2 — Register routes in `App.jsx`
- [ ] Add:
```jsx
<Route path="/absences/new" element={<AbsencePage />} />
<Route path="/absences/:id/edit" element={<AbsencePage />} />
```
Both routes should be inside a `ProtectedRoute` wrapper (authenticated users only).

---

### Story F.4 — Tests (Vitest)

#### Task F.4.1 — Component tests
- [ ] Cover:
- Type change to `sick`/`מילואים` → document field appears
- Type change to `vacation` → document field hidden
- Future date selected for `vacation` → inline error shown
- Any validation error present → submit button disabled / form does not call API
- File > 20 MB → error shown, API not called, form not submitted
- Conflict modal appears; clicking ביטול closes it without submitting; clicking החלף calls API
- Successful submit → success message "הדיווח נשמר בהצלחה" shown, form reset
- API error on submit → error message shown inline, form stays open
- Duration selector "יום אחד" → only one date input shown; `end_date` equals `start_date` on submit
- Duration selector "מספר ימים" → both date inputs shown
- Dates in different months → red error shown, form not submitted
- Working-day counter updates correctly (excludes Fri–Sat) when dates change
- `half_vacation_day` selected → counter shows "0.5 ימי עבודה", duration selector hidden
- Successful document upload → "הקובץ עלה בהצלחה" label shown below filename
- Failed document upload → "אירעה תקלה בטעינת הקובץ" label shown, new upload allowed
- Delete button (×) clicked → calls DELETE endpoint, filename and status label cleared, input reset
- Editing absence with existing document → filename shown with delete button and success label pre-set
