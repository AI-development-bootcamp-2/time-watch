const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  runMigrationsOnStartup: process.env.RUN_MIGRATIONS_ON_STARTUP !== "false"
};

module.exports = { env };
