require('dotenv').config()

const { createApp } = require('./app')
const { runMigrations } = require('./db/knex')
const { scheduleMidnightSplit } = require('./cron/midnightSplit')

// שינוי 1: וידוא שהפורט דינמי (חשוב ל-Render)
const PORT = process.env.PORT || 3000
const shouldRunMigrations = process.env.RUN_MIGRATIONS_ON_STARTUP !== 'false'

async function startServer() {
  if (shouldRunMigrations) {
    console.log('Running database migrations...');
    await runMigrations()
  }

  const app = createApp()

  scheduleMidnightSplit()

  // שינוי 2: האזנה ל-'0.0.0.0' - קריטי כדי ש-Render יוכל לגשת לשרת מבחוץ
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend is LIVE! Listening on port: ${PORT}`);
    
    // שינוי 3: לוגים חכמים יותר שתלויים בסביבה
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Local Swagger UI: http://localhost:${PORT}/api-docs`);
    }
  })
}

startServer().catch((error) => {
  console.error('Failed to start backend', error)
  process.exit(1)
})
