---
name: node-api-endpoint
description: ALWAYS use this skill when adding or modifying a backend route, controller, or middleware in the Express API. Triggers on "add an endpoint", "create a route", "handle POST/GET/PUT/DELETE", or any backend API feature.
---

## Rules

- Routes live in `backend/routes/`, controllers in `backend/controllers/`, middleware in `backend/middleware/`
- Every route that touches user data requires the `authenticate` middleware (JWT check)
- Admin-only routes also require the `requireAdmin` middleware
- Validate request body/params with express-validator before the controller runs
- Controllers return `{ data }` on success; errors use `next(err)` with `{ status, message }`
- Never put business logic in routes — routes only wire middleware + controller
- Soft-delete pattern: use `deleted_at = NOW()` instead of `DELETE`

## Structure

```
backend/
  routes/resource.js       ← app.use('/api/resource', router)
  controllers/resource.js  ← exported async functions
  middleware/auth.js        ← authenticate, requireAdmin
```

Route template:

```js
// routes/resource.js
import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/resource.js';

const router = Router();

router.get('/', authenticate, ctrl.list);
router.post('/',
  authenticate,
  requireAdmin,
  [body('name').notEmpty().trim()],
  validate,
  ctrl.create
);

export default router;
```

Controller template:

```js
// controllers/resource.js
import db from '../db.js';

export async function list(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT * FROM resources WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}
```

## Example

**Input:** "add a POST /api/reports endpoint that saves a time report"

**Output:** route with `authenticate`, body validation (date, taskId, startTime, endTime, location), controller that inserts into `reports` table, returns `{ data: newReport }`.
