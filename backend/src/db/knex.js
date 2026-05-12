const knex = require("knex");
const knexConfigs = require("../../knexfile.cjs");

const nodeEnv = process.env.NODE_ENV || "development";
const config = knexConfigs[nodeEnv] || knexConfigs.development;

const db = knex(config);

db.runMigrations = async (database = db) => database.migrate.latest();
db.closeDatabase  = async (database = db) => database.destroy();

module.exports = db;
