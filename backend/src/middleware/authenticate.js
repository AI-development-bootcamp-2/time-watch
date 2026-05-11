'use strict';

const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

function authenticate(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return next(new UnauthorizedError());

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError());
  }
}

module.exports = authenticate;
