## ADDED Requirements

### Requirement: Login page renders at /login
The system SHALL render a Hebrew RTL login form at the `/login` route, containing an email input, a password input, a submit button labelled "התחבר", and an inline error area.

#### Scenario: Login page loads with correct labels
- **WHEN** a user navigates to `/login`
- **THEN** the page displays the email field labelled "דואר אלקטרוני", the password field labelled "סיסמה", and a submit button labelled "התחבר"

#### Scenario: Page renders in RTL
- **WHEN** the login page is displayed
- **THEN** text and form elements are aligned right-to-left

---

### Requirement: Successful login redirects to home
The system SHALL call `POST /api/auth/login` on form submit and, upon HTTP 200, store the returned JWT token and redirect the user to `/`.

#### Scenario: Valid credentials redirect to home
- **WHEN** a user submits the form with valid email and password
- **AND** the server responds with HTTP 200 and a JWT token
- **THEN** the token is saved to `localStorage` under the key `authToken`
- **AND** the user is redirected to `/`

---

### Requirement: Invalid credentials show inline error
The system SHALL display a Hebrew inline error message when the server returns HTTP 401.

#### Scenario: Wrong email or password shows error
- **WHEN** a user submits the form with an incorrect email or password
- **AND** the server responds with HTTP 401
- **THEN** the error message "האימייל או הסיסמה שגויים" is displayed inline in the form

---

### Requirement: Locked account shows inline error
The system SHALL display a Hebrew inline error message when the server returns HTTP 423.

#### Scenario: Account locked shows error
- **WHEN** a user submits the form and the server responds with HTTP 423
- **THEN** the error message "החשבון ננעל עקב ניסיונות התחברות מרובים" is displayed inline in the form

---

### Requirement: Network failure shows generic error
The system SHALL display a generic Hebrew error message when the API call fails due to a network error (no response).

#### Scenario: Network error shows generic message
- **WHEN** a user submits the form and no response is received (network failure)
- **THEN** the error message "אירעה שגיאה. נסי שוב מאוחר יותר" is displayed inline in the form

---

### Requirement: Submit button disabled during request
The system SHALL disable the submit button and show a loading state while the login API request is in progress, preventing duplicate submissions.

#### Scenario: Button disabled while loading
- **WHEN** the user submits the form and the API request is pending
- **THEN** the submit button is disabled and shows a loading indicator

#### Scenario: Button re-enabled after response
- **WHEN** the API request completes (success or error)
- **THEN** the submit button is enabled again

---

### Requirement: Authenticated users redirected from /login
The system SHALL redirect users who already hold a valid auth token away from `/login` to `/`.

#### Scenario: Already-authenticated user visits /login
- **WHEN** a user with a token in `localStorage` (`authToken` key) navigates to `/login`
- **THEN** they are immediately redirected to `/`

---

### Requirement: Error clears on new submission
The system SHALL clear any displayed error message when the user submits the form again.

#### Scenario: Previous error is cleared on resubmit
- **WHEN** an error message is displayed and the user submits the form again
- **THEN** the error message disappears before the new request completes
