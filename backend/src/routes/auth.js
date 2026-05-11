'use strict';

const router = require('express').Router();
const { login } = require('../controllers/authController');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: israel@example.com
 *               password:
 *                 type: string
 *                 example: Temp1234!
 *     responses:
 *       200:
 *         description: >
 *           Login successful. Sets `Set-Cookie: token=<jwt>; HttpOnly; SameSite=Strict`.
 *           The token is not returned in the response body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 full_name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *                 role:
 *                   type: string
 *                   enum: [employee, admin]
 *       400:
 *         description: Validation error — missing or malformed fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Invalid credentials — wrong email or password (same message for both)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       423:
 *         description: Account locked after too many failed attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', login);

router.post('/logout', (_req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'לא מומש' }));
router.get('/me',     (_req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'לא מומש' }));

module.exports = router;
