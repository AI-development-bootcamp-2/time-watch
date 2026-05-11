'use strict';

class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class ValidationError extends AppError {
  constructor(details) {
    super(400, 'VALIDATION_ERROR', 'שגיאת קלט');
    this.details = details;
  }
}

class ConflictError extends AppError {
  constructor(message = 'כתובת האימייל כבר קיימת במערכת') {
    super(409, 'CONFLICT', message);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'נדרשת התחברות') {
    super(401, 'UNAUTHENTICATED', message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'גישה מותרת למנהלים בלבד') {
    super(403, 'FORBIDDEN', message);
  }
}

module.exports = { AppError, ValidationError, ConflictError, UnauthorizedError, ForbiddenError };
