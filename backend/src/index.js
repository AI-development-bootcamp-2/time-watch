require('dotenv').config()
<<<<<<< nadav
const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')

const healthRouter = require('./routes/health')

const app = express()
=======

const { createApp } = require('./app')
const { runMigrations } = require('./db/knex')

>>>>>>> dev
const PORT = process.env.PORT || 3000
const shouldRunMigrations = process.env.RUN_MIGRATIONS_ON_STARTUP !== 'false'

async function startServer() {
  if (shouldRunMigrations) {
    await runMigrations()
  }

  const app = createApp()

<<<<<<< nadav
app.use('/api/health', healthRouter)
=======
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
}
>>>>>>> dev

startServer().catch((error) => {
  console.error('Failed to start backend', error)
  process.exit(1)
})
