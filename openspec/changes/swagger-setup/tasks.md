## 1. Install Packages

- [ ] 1.1 Run `npm install swagger-jsdoc swagger-ui-express` inside the `backend/` folder

## 2. Create Swagger Config

- [ ] 2.1 Create `backend/swagger.js` with the base OpenAPI definition (title, version, description, server URL)
- [ ] 2.2 Set the glob pattern in the config to scan route files for `@swagger` JSDoc comments

## 3. Wire Up Middleware

- [ ] 3.1 Import the Swagger config and `swagger-ui-express` in `backend/app.js` (or `server.js`)
- [ ] 3.2 Mount the Swagger UI at `GET /api/docs`

## 4. Add a Sample Doc Comment

- [ ] 4.1 Add one `@swagger` JSDoc comment to an existing route as a working template for the team to copy

## 5. Verify

- [ ] 5.1 Start the backend and open `/api/docs` in the browser — confirm the UI loads and shows the sample endpoint
