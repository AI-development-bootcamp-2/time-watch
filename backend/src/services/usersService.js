'use strict';

const bcrypt = require('bcrypt');
const usersRepository = require('../repositories/usersRepository');
const { db } = require('../db/knex');
const { ConflictError, PasswordComplexityError, NotFoundError, BadRequestError } = require('../utils/errors');

const SAFE_COLS = ['id', 'full_name', 'email', 'role', 'is_active', 'must_change_password', 'created_at'];

const BCRYPT_COST = 12;

// Validates password complexity rules; throws PasswordComplexityError if any rule fails
function checkPasswordComplexity(password) {
  const missing = [];
  if (password.length < 8)              missing.push('לפחות 8 תווים');
  if (!/[A-Z]/.test(password))          missing.push('אות גדולה אחת לפחות');
  if (!/[a-z]/.test(password))          missing.push('אות קטנה אחת לפחות');
  if (!/\d/.test(password))             missing.push('ספרה אחת לפחות');
  if (!/[^A-Za-z0-9]/.test(password))  missing.push('תו מיוחד אחד לפחות');
  if (missing.length > 0) {
    throw new PasswordComplexityError([{ field: 'password', message: `הסיסמה חייבת לכלול: ${missing.join(', ')}` }]);
  }
}

// Creates a new user with hashed password and must_change_password flag set to true
async function createUser({ full_name, email, password, role }) {
  checkPasswordComplexity(password);
  const password_hash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    return await usersRepository.create({ full_name, email, password_hash, role, must_change_password: true });
  } catch (err) {
    if (err.code === '23505') throw new ConflictError();
    throw err;
  }
}

// Returns all non-deleted users ordered by name
async function listUsers() {
  return usersRepository.findAll();
}

// Updates full_name/email/role and optionally re-hashes a new password; throws NotFoundError/ConflictError/PasswordComplexityError
async function updateUser(id, { full_name, email, role, password }) {
  const existing = await usersRepository.findByIdFull(id);
  if (!existing) throw new NotFoundError('המשתמש לא נמצא');

  const patch = { full_name, email, role };
  if (password !== undefined) {
    checkPasswordComplexity(password);
    patch.password_hash = await bcrypt.hash(password, BCRYPT_COST);
  }

  try {
    return await usersRepository.update(id, patch);
  } catch (err) {
    if (err.code === '23505') throw new ConflictError();
    throw err;
  }
}

// Soft-deactivates a user inside a transaction; blocks deactivating the last active admin (idempotent for already-inactive)
async function deactivateUser(id) {
  return db.transaction(async (trx) => {
    const user = await usersRepository.lockUserForUpdate(id, trx);
    if (!user) throw new NotFoundError('המשתמש לא נמצא');

    if (!user.is_active) {
      return trx('users').where({ id }).whereNull('deleted_at').select(SAFE_COLS).first();
    }

    if (user.role === 'admin') {
      const lockedAdmins = await usersRepository.lockActiveAdmins(trx);
      if (lockedAdmins.length <= 1) {
        throw new BadRequestError('Cannot deactivate the last active admin');
      }
    }

    return usersRepository.setActiveTx(id, false, trx);
  });
}

module.exports = { createUser, listUsers, updateUser, deactivateUser };
