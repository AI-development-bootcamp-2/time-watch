'use strict';

const bcrypt = require('bcrypt');
const usersRepository = require('../repositories/usersRepository');
const { ConflictError } = require('../utils/errors');

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

module.exports = { createUser };
