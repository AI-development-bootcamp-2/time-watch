'use strict';

const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');

function authenticate(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return next(new UnauthorizedError());

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError());
  }
}

module.exports = authenticate;
