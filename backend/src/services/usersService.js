'use strict';

const bcrypt = require('bcrypt');
const usersRepository = require('../repositories/usersRepository');
const { AppError, ConflictError, NotFoundError } = require('../utils/errors');

const BCRYPT_COST = 12;

async function createUser({ full_name, email, password, role }) {
  const password_hash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    return await usersRepository.create({ full_name, email, password_hash, role });
  } catch (err) {
    if (err.code === '23505') throw new ConflictError();
    throw err;
  }
}

// Returns all non-deleted users
async function listUsers() {
  return usersRepository.findAll();
}

// Updates a user; hashes password only when a non-empty value is supplied
async function updateUser(id, { full_name, email, password, role, is_active }) {
  const fields = {};
  if (full_name  !== undefined) fields.full_name  = full_name.trim();
  if (email      !== undefined) fields.email      = email.trim().toLowerCase();
  if (role       !== undefined) fields.role       = role;
  if (is_active  !== undefined) fields.is_active  = is_active;
  if (password)                 fields.password_hash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    const user = await usersRepository.update(id, fields);
    if (!user) throw new NotFoundError('משתמש לא נמצא');
    return user;
  } catch (err) {
    if (err.code === '23505') throw new ConflictError();
    throw err;
  }
}

// Sets is_active=false; blocks deactivation of the last active admin
async function deactivateUser(id) {
  const user = await usersRepository.findById(id);
  if (!user) throw new NotFoundError('משתמש לא נמצא');

  if (user.role === 'admin') {
    const count = await usersRepository.countActiveAdmins();
    if (count <= 1) throw new AppError(400, 'LAST_ADMIN', 'לא ניתן להשבית את המנהל האחרון');
  }

  return usersRepository.update(id, { is_active: false });
}

module.exports = { createUser, listUsers, updateUser, deactivateUser };
