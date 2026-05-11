require('dotenv').config();

const connection = process.env.DATABASE_URL || {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5433,
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'timewatch',
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'timewatch',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || 'timewatch',
};

const config = {
  client: 'pg',
  connection,
  migrations: { directory: './migrations' },
  seeds: { directory: './seeds' },
};

module.exports = {
  development: config,
  test: config,
  production: config,
};
