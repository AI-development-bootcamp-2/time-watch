'use strict';

const { login: loginService } = require('../services/authService');
const { validateLogin } = require('../utils/validate');
const { ValidationError } = require('../utils/errors');

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000,
};

async function login(req, res, next) {
  try {
    const { valid, errors } = validateLogin(req.body);
    if (!valid) return next(new ValidationError(errors));

    const { token, user } = await loginService(req.body);

    res.cookie('token', token, {
      ...COOKIE_OPTIONS,
      secure: process.env.NODE_ENV === 'production',
    });

    res.status(200).json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
