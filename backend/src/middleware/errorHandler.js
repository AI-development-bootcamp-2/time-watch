'use strict';

const { AppError, ValidationError } = require('../utils/errors');

function errorHandler(err, req, res, _next) {
  if (err instanceof ValidationError) {
    return res.status(400).json({ code: err.code, message: err.message, details: err.details });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ code: err.code, message: err.message });
  }
  console.error(err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'שגיאת שרת' });
}

module.exports = errorHandler;
