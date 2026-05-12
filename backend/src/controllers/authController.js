'use strict';

const { login: loginService, changePassword: changePasswordService } = require('../services/authService');
const usersRepository = require('../repositories/usersRepository');
const { validateLogin } = require('../utils/validate');
const { ValidationError, UnauthorizedError } = require('../utils/errors');

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
};

const COOKIE_OPTIONS = {
  ...COOKIE_BASE,
  maxAge: 8 * 60 * 60 * 1000,
};

async function login(req, res, next) {
  try {
    const { valid, errors } = validateLogin(req.body);
    if (!valid) return next(new ValidationError(errors));

    const { token, user } = await loginService(req.body);

    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(200).json({
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      must_change_password: user.must_change_password,
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.cookie('token', '', { ...COOKIE_BASE, maxAge: 0 });
  res.status(200).json({ message: 'התנתקת בהצלחה' });
}

async function me(req, res, next) {
  try {
    const user = await usersRepository.findById(req.user.id);
    if (!user) return next(new UnauthorizedError());
    res.status(200).json({ id: user.id, name: user.full_name, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
}

// Handles POST /api/auth/change-password; requires valid session via authenticate middleware
async function changePassword(req, res, next) {
  try {
    await changePasswordService(req.user.id, req.body);
    res.status(200).json({ message: 'הסיסמה שונתה בהצלחה' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, me, changePassword };
