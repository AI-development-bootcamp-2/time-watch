const knex = require("knex");
const knexConfigs = require("../../knexfile.cjs");

const nodeEnv = process.env.NODE_ENV || "development";
const config = knexConfigs[nodeEnv] || knexConfigs.development;

const db = knex(config);

async function runMigrations(database = db) {
  return database.migrate.latest();
}

async function closeDatabase(database = db) {
  return database.destroy();
}

module.exports = {
  db,
  runMigrations,
  closeDatabase
};
