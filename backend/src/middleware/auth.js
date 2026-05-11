'use strict';

const { TokenExpiredError, JsonWebTokenError } = require('jsonwebtoken');
const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

function authenticate(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return next(new UnauthorizedError());

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
      return next(new UnauthorizedError());
    }
    next(err);
  }
}

// Guards routes by role — usage: requireRole('admin') or requireRole('admin', 'manager')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}

module.exports = { authenticate, requireRole };
