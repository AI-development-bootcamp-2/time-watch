require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./config/swagger')

const healthRouter = require('./routes/health')
const timerRouter = require('./routes/timer')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use('/api/health', healthRouter)
app.use('/api/timer', timerRouter)

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`)
})
