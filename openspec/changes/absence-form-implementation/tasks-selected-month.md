# Selected Month Handoff Tasks

## Story F.5 - Selected Month Handoff

### Task F.5.1 - Monthly page opens absence form with selected month
- [ ] From the monthly page, open new absence reporting as `/absences/new?month=<selected-month>` so the selected reporting month is preserved across navigation and refresh.

### Task F.5.2 - Absence form enforces selected month
- [ ] `AbsencePage` reads optional `?month=YYYY-MM` and passes it to `<AbsenceForm reportingMonth={month} />`. In edit mode, fall back to the loaded absence's month when no query param exists.
- [ ] `AbsenceForm` limits date pickers to the selected reporting month.
- [ ] If `start_date` or `end_date` is outside the selected reporting month, show inline error "ניתן לדווח רק על תאריכים בחודש הנבחר" and block submission.

### Task F.5.3 - Tests
- [ ] Date outside the selected reporting month -> inline error shown, form not submitted.
- [ ] Date picker receives first/last day bounds for the selected reporting month.
- [ ] Monthly page absence action -> navigates to `/absences/new?month=YYYY-MM` for the currently viewed month.
