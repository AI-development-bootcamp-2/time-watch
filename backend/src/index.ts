import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './swagger'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
