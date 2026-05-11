'use strict';

const { createUser } = require('../services/usersService');
const { validateCreateUser } = require('../utils/validate');
const { ValidationError } = require('../utils/errors');

async function create(req, res, next) {
  try {
    const errors = validateCreateUser(req.body);
    if (errors.length > 0) return next(new ValidationError(errors));

    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { create };
