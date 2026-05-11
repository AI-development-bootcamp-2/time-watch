'use strict';

const router = require('express').Router();
const { login, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

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
 *                 name:
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

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out and clear the session cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: >
 *           Logout successful. Sets `Set-Cookie: token=; Max-Age=0; HttpOnly; SameSite=Strict`
 *           to instruct the browser to expire the cookie immediately.
 *           Idempotent — returns 200 whether or not a cookie was present.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: התנתקת בהצלחה
 */
router.post('/logout', logout);
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the current authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *                 role:
 *                   type: string
 *                   enum: [employee, admin]
 *       401:
 *         description: Missing, invalid, or expired JWT cookie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authenticate, me);

module.exports = router;
