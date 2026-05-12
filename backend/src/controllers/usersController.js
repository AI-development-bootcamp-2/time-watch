'use strict';

const { createUser, listUsers, updateUser, deactivateUser } = require('../services/usersService');
const { validateCreateUser, validateUpdateUser } = require('../utils/validate');
const { ValidationError, NotFoundError } = require('../utils/errors');

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

// Updates full_name/email/role (and optionally password) for a user; admin only
async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(new NotFoundError('המשתמש לא נמצא'));

    const { valid, errors } = validateUpdateUser(req.body);
    if (!valid) return next(new ValidationError(errors));

    const user = await updateUser(id, req.body);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

// Soft-deactivates a user; admin only
async function deactivate(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(new NotFoundError('המשתמש לא נמצא'));

    const user = await deactivateUser(id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, update, deactivate };
