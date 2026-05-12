const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const router = require('express').Router()
const { db } = require('../db/knex')
const { authenticate } = require('../middleware/auth')

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await db('users').where({ email, is_active: true }).first()
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('token', token, COOKIE_OPTS)
    res.json({ id: user.id, email: user.email, role: user.role, full_name: user.full_name })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('token', COOKIE_OPTS)
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json(req.user)
})

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
module.exports = router;
