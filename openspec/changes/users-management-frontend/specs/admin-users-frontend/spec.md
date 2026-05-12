## Data Shapes

### User object (returned by `GET /api/users` and `POST /api/users` / `PUT /api/users/:id`)

```js
{
  id:        string,   // UUID
  full_name: string,
  email:     string,
  role:      'employee' | 'admin',
  is_active: boolean
}
```

This shape is the source of truth for pre-filling the edit modal and for rendering each table row. No other fields are read or written by the frontend.

---

## ADDED Requirements

### Requirement: Admin can view all users in a table
The system SHALL display a full-page RTL table of all users when an authenticated admin navigates to `/admin/users`. The table SHALL include columns: full name, email, role, and active/inactive status badge.

#### Scenario: Admin views users list
- **WHEN** an authenticated admin navigates to `/admin/users`
- **THEN** the system fetches `GET /api/users` and renders a table with all users
- **AND** each row displays: full name, email, role (in Hebrew: "עובד" / "אדמין"), and a colour-coded status badge (active = green, inactive = grey)

#### Scenario: List loads in loading state
- **WHEN** the API call is in flight
- **THEN** a loading indicator is shown and the table content is suppressed until data arrives

#### Scenario: API error on page load
- **WHEN** `GET /api/users` returns a non-2xx response
- **THEN** an inline error message is displayed instead of the table

#### Scenario: Non-admin navigates directly to `/admin/users`
- **WHEN** a non-admin user navigates to any `/admin/*` path
- **THEN** the router redirects them to `/` without rendering the admin content

---

### Requirement: Admin can filter users by status
The system SHALL provide a filter control with three options — "הכל" (all), "פעיל" (active), "לא פעיל" (inactive) — that client-side filters the rendered table rows without a new API call.

#### Scenario: Admin selects "פעיל" filter
- **WHEN** the admin selects the "פעיל" filter
- **THEN** only rows where `is_active === true` are visible in the table

#### Scenario: Admin selects "לא פעיל" filter
- **WHEN** the admin selects the "לא פעיל" filter
- **THEN** only rows where `is_active === false` are visible in the table

#### Scenario: Admin selects "הכל" filter
- **WHEN** the admin selects the "הכל" filter
- **THEN** all rows are visible regardless of `is_active` value

---

### Requirement: Admin can open an add-user modal
The system SHALL display an empty `UserModal` when the admin clicks the "הוסף משתמש" button.

#### Scenario: Admin clicks "הוסף משתמש"
- **WHEN** the admin clicks the "הוסף משתמש" button on the `UsersPage`
- **THEN** a modal opens with all fields empty, the title "משתמש חדש", and a required password field
- **AND** the active toggle defaults to "פעיל"

---

### Requirement: Admin can open an edit-user modal by clicking a row
The system SHALL display a pre-filled `UserModal` when the admin clicks on a user row in the table.

#### Scenario: Admin clicks an existing user row
- **WHEN** the admin clicks on a row in the users table
- **THEN** a modal opens pre-filled with the user's current full name, email, role, and active status
- **AND** the password field is empty (filling it is optional — only updates the password if non-empty)
- **AND** the modal title is "עריכת משתמש"
- **AND** a "השבת משתמש" (Deactivate) button is visible at the bottom of the modal for active users

---

### Requirement: Closing the modal resets all error state
The system SHALL clear all validation errors and API errors when the modal is closed, so that reopening the modal (for any user) shows a clean form with no residual error state.

#### Scenario: Admin closes modal after a validation error
- **WHEN** the admin submits the modal with invalid data (triggering inline field errors) and then closes the modal
- **THEN** all field-level validation errors are cleared
- **AND** reopening the modal shows no error messages

#### Scenario: Admin closes modal after an API error
- **WHEN** the modal displays an inline API error (e.g., duplicate email) and the admin closes it
- **THEN** the modal-level API error is cleared
- **AND** reopening the modal shows no error messages

---

### Requirement: Password is omitted from edit requests when not provided
The system SHALL only include the `password` field in the `PUT /api/users/:id` request body when the admin has entered a non-empty value in the password field. An empty password field in edit mode means "do not change the password."

#### Scenario: Admin saves edit with empty password field
- **WHEN** the admin submits the edit modal leaving the password field empty
- **THEN** `PUT /api/users/:id` is called without a `password` key in the request body

#### Scenario: Admin resets password in edit modal
- **WHEN** the admin enters a valid new password in the edit modal and submits
- **THEN** `PUT /api/users/:id` is called with the `password` key present in the request body

---

### Requirement: Client-side validation blocks submission with Hebrew error messages
The system SHALL validate all `UserModal` fields client-side before any API call is made. All error messages SHALL be displayed in Hebrew inline next to the invalid field.

#### Scenario: Required field is empty on create
- **WHEN** the admin submits the modal with full name or email empty
- **THEN** the form is not submitted
- **AND** the message "שדה חובה" appears below each empty required field

#### Scenario: Invalid email format
- **WHEN** the admin submits with an email that does not match a valid email pattern
- **THEN** the form is not submitted
- **AND** the message "אימייל לא תקין" appears below the email field

#### Scenario: Password missing on create
- **WHEN** the admin submits the create form without a password
- **THEN** the form is not submitted
- **AND** the message "שדה חובה" appears below the password field

#### Scenario: Password fails complexity on create or reset
- **WHEN** the admin enters a password that fails complexity rules (≥8 chars, uppercase, lowercase, digit, special character)
- **THEN** the form is not submitted
- **AND** the message "הסיסמה חייבת לכלול: …" appears below the password field, listing each failing rule

---

### Requirement: Save action calls the correct API endpoint and surfaces API errors inline
The system SHALL call `POST /api/users` when saving a new user and `PUT /api/users/:id` when saving an edited user. API errors SHALL be displayed inline inside the modal.

#### Scenario: Successful create
- **WHEN** the admin submits valid create-user data
- **THEN** `POST /api/users` is called
- **AND** on 201 the modal closes and the users table refreshes to include the new user

#### Scenario: Successful edit
- **WHEN** the admin submits valid edit data
- **THEN** `PUT /api/users/:id` is called with the user's id
- **AND** on 200 the modal closes and the users table refreshes with updated data

#### Scenario: Duplicate email error from API
- **WHEN** the API returns 409 Conflict
- **THEN** the modal stays open
- **AND** the message "כתובת האימייל כבר קיימת במערכת" appears inline in the modal

#### Scenario: Generic API error
- **WHEN** the API returns any other non-2xx response
- **THEN** the modal stays open
- **AND** a generic Hebrew error message is displayed inline in the modal

---

### Requirement: Deactivate button in edit modal calls the deactivate endpoint
The system SHALL provide a "השבת משתמש" button in the edit modal that calls `PATCH /api/users/:id/deactivate`. The last-admin guard error SHALL be surfaced inline.

#### Scenario: Successful deactivation
- **WHEN** the admin clicks "השבת משתמש" for a non-last-admin user
- **THEN** `PATCH /api/users/:id/deactivate` is called
- **AND** on 200 the modal closes and the table row updates to show the user as inactive

#### Scenario: Last-admin guard triggers
- **WHEN** `PATCH /api/users/:id/deactivate` returns 400
- **THEN** the modal stays open
- **AND** the API error message is displayed inline in the modal (e.g., "לא ניתן להשבית את המנהל האחרון")

---

### Requirement: Admin route is protected and admin nav is hidden for non-admins
The system SHALL apply the existing `AdminRoute` guard to all `/admin/*` routes. The "ניהול" bottom-nav tab SHALL be rendered only when the current user has `role === 'admin'`.

#### Scenario: Unauthenticated user visits `/admin/users`
- **WHEN** a user without a valid session visits `/admin/users`
- **THEN** the router redirects them to `/login`

#### Scenario: Authenticated non-admin user visits `/admin/users`
- **WHEN** an authenticated employee navigates to `/admin/users`
- **THEN** the router redirects them to `/`
- **AND** the "ניהול" tab is not visible in the bottom nav

#### Scenario: Admin user sees "ניהול" tab
- **WHEN** an authenticated admin user is on any page
- **THEN** the "ניהול" bottom-nav tab is visible and links to `/admin`
- **AND** navigating to `/admin` immediately redirects to `/admin/users` via the index route
