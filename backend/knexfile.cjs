require("dotenv").config();

const connection = process.env.DATABASE_URL || {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "time_watch",
  user: process.env.DB_USER || "time_watch",
  password: process.env.DB_PASSWORD || "time_watch"
};

const baseConfig = {
  client: "pg",
  connection,
  migrations: {
    directory: "./migrations",
    extension: "cjs",
    tableName: "knex_migrations"
  },
  pool: {
    min: 0,
    max: Number(process.env.DB_POOL_MAX || 10)
  }
};

module.exports = {
  development: baseConfig,
  test: {
    ...baseConfig,
    connection: process.env.TEST_DATABASE_URL || connection
  },
  production: {
    ...baseConfig,
    pool: {
      min: Number(process.env.DB_POOL_MIN || 2),
      max: Number(process.env.DB_POOL_MAX || 10)
    }
  }
};
