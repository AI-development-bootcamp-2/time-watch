require('dotenv').config()

const { createApp } = require('./app')
const { runMigrations } = require('./db/knex')

const PORT = process.env.PORT || 3000
const shouldRunMigrations = process.env.RUN_MIGRATIONS_ON_STARTUP !== 'false'

async function startServer() {
  if (shouldRunMigrations) {
    await runMigrations()
  }

  const app = createApp()

  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
    console.log(`Swagger UI: http://localhost:${PORT}/api-docs`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start backend', error)
  process.exit(1)
})
