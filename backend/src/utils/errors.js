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
    super(409, 'EMAIL_CONFLICT', message);
  }
}

class PasswordComplexityError extends AppError {
  constructor(details) {
    super(422, 'PASSWORD_COMPLEXITY', 'הסיסמה אינה עומדת בדרישות');
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'נדרשת התחברות') {
    super(401, 'UNAUTHENTICATED', message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'אין לך הרשאה לבצע פעולה זו') {
    super(403, 'FORBIDDEN', message);
  }
}

class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, 'INVALID_CREDENTIALS', 'אימייל או סיסמה שגויים');
  }
}

class AccountLockedError extends AppError {
  constructor(minutesRemaining) {
    super(423, 'ACCOUNT_LOCKED', `החשבון נעול זמנית. נסה שוב בעוד ${minutesRemaining} דקות.`);
    this.minutesRemaining = minutesRemaining;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'המשאב לא נמצא') {
    super(404, 'NOT_FOUND', message);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'בקשה לא תקינה') {
    super(400, 'BAD_REQUEST', message);
  }
}

class AccountInactiveError extends AppError {
  constructor() {
    super(403, 'ACCOUNT_INACTIVE', 'החשבון אינו פעיל');
  }
}

// Distinct from PASSWORD_COMPLEXITY: fired specifically when new_password === current_password
class PasswordReuseError extends AppError {
  constructor() {
    super(422, 'PASSWORD_REUSE', 'הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית');
  }
}

module.exports = {
  AppError,
  ValidationError,
  ConflictError,
  PasswordComplexityError,
  PasswordReuseError,
  UnauthorizedError,
  ForbiddenError,
  InvalidCredentialsError,
  AccountLockedError,
  NotFoundError,
  BadRequestError,
  AccountInactiveError,
};
