require('dotenv').config()
const knexLib = require('knex')
const knexConfigs = require('../../knexfile.cjs')

const nodeEnv = process.env.NODE_ENV || 'development'
const config = knexConfigs[nodeEnv] || knexConfigs.development

const db = knexLib(config)

async function runMigrations(database = db) {
  return database.migrate.latest()
}

async function closeDatabase(database = db) {
  return database.destroy()
}

// Default export is the knex instance for backward-compat (repositories use: require('../db/knex'))
module.exports = db
module.exports.db = db
module.exports.runMigrations = runMigrations
module.exports.closeDatabase = closeDatabase
