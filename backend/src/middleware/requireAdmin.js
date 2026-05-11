'use strict';

const { ForbiddenError } = require('../utils/errors');

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return next(new ForbiddenError());
  next();
}

module.exports = requireAdmin;
