'use strict';

const db = require('../db/knex');

const SAFE_COLUMNS = ['id', 'full_name', 'email', 'role', 'is_active', 'created_at'];
const MAX_FAILED_ATTEMPTS = 3;

async function findByEmail(email) {
  return db('users')
    .whereRaw('LOWER(email) = LOWER(?)', [email])
    .whereNull('deleted_at')
    .where({ is_active: true })
    .first();
}

async function create({ full_name, email, password_hash, role }) {
  const [user] = await db('users')
    .insert({ full_name, email, password_hash, role })
    .returning(SAFE_COLUMNS);
  return user;
}

async function incrementFailedAttempts(id) {
  const [row] = await db('users')
    .where({ id })
    .update({
      failed_attempts: db.raw('failed_attempts + 1'),
      locked_until: db.raw(
        `CASE WHEN failed_attempts + 1 >= ${MAX_FAILED_ATTEMPTS} THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END`
      ),
    })
    .returning(['id', 'failed_attempts', 'locked_until']);
  return row;
}

async function findById(id) {
  return db('users')
    .where({ id, is_active: true })
    .whereNull('deleted_at')
    .select(SAFE_COLUMNS)
    .first();
}

async function resetLockout(id) {
  const [row] = await db('users')
    .where({ id })
    .update({
      failed_attempts: 0,
      locked_until: null,
      last_login_at: db.raw('NOW()'),
    })
    .returning(['id', 'failed_attempts', 'locked_until', 'last_login_at']);
  return row;
}

// Returns all non-deleted users ordered alphabetically
async function findAll() {
  return db('users')
    .whereNull('deleted_at')
    .select(SAFE_COLUMNS)
    .orderBy('full_name', 'asc');
}

// Updates arbitrary fields on a non-deleted user; returns updated row or undefined
async function update(id, fields) {
  const [user] = await db('users')
    .where({ id })
    .whereNull('deleted_at')
    .update({ ...fields, updated_at: db.raw('NOW()') })
    .returning(SAFE_COLUMNS);
  return user;
}

// Counts active admins (used by last-admin guard before deactivation)
async function countActiveAdmins() {
  const result = await db('users')
    .where({ role: 'admin', is_active: true })
    .whereNull('deleted_at')
    .count('id as count')
    .first();
  return parseInt(result.count, 10);
}

module.exports = { findByEmail, findById, findAll, create, update, countActiveAdmins, incrementFailedAttempts, resetLockout };
