'use strict';

const { createUser, listUsers } = require('../services/usersService');
const { validateCreateUser } = require('../utils/validate');
const { ValidationError } = require('../utils/errors');

async function create(req, res, next) {
  try {
    const { valid, errors } = validateCreateUser(req.body);
    if (!valid) return next(new ValidationError(errors));

    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

// Returns all non-deleted users; admin only
async function list(req, res, next) {
  try {
    const users = await listUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list };
