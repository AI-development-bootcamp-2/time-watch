'use strict';

const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { create } = require('../controllers/usersController');

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user (admin only)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, email, password, role]
 *             properties:
 *               full_name:
 *                 type: string
 *                 maxLength: 150
 *                 example: ישראל ישראלי
 *               email:
 *                 type: string
 *                 format: email
 *                 example: israel@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character
 *                 example: Temp1234!
 *               role:
 *                 type: string
 *                 enum: [employee, admin]
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Caller is not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticate, requireRole('admin'), create);

router.get('/',             (_req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'לא מומש' }));
router.put('/:id',          (_req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'לא מומש' }));
router.patch('/:id/deactivate', (_req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'לא מומש' }));

module.exports = router;
