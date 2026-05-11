'use strict';

const { db } = require('../db/knex');

const SAFE_COLUMNS = ['id', 'full_name', 'email', 'role', 'is_active', 'created_at'];

async function findByEmail(email) {
  return db('users')
    .whereRaw('LOWER(email) = LOWER(?)', [email])
    .whereNull('deleted_at')
    .first();
}

async function create({ full_name, email, password_hash, role }) {
  const [user] = await db('users')
    .insert({ full_name, email, password_hash, role })
    .returning(SAFE_COLUMNS);
  return user;
}

module.exports = { findByEmail, create };
