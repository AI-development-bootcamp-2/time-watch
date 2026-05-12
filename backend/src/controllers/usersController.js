'use strict';

const { createUser, listUsers, updateUser, deactivateUser } = require('../services/usersService');
const { validateCreateUser, validateUpdateUser } = require('../utils/validate');
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

// GET /api/users — list all users (admin only)
async function list(req, res, next) {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/:id — update a user (admin only)
async function update(req, res, next) {
  try {
    const { valid, errors } = validateUpdateUser(req.body);
    if (!valid) return next(new ValidationError(errors));

    const user = await updateUser(Number(req.params.id), req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/deactivate — soft-deactivate a user (admin only)
async function deactivate(req, res, next) {
  try {
    const user = await deactivateUser(Number(req.params.id));
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, update, deactivate };
