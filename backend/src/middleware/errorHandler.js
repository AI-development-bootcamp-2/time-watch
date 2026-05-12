'use strict';

const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }
  console.error(err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'שגיאת שרת' });
}

module.exports = errorHandler;
