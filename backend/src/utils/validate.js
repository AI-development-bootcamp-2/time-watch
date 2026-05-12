'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(['employee', 'admin']);

function validateCreateUser({ full_name, email, password, role } = {}) {
  const errors = [];

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
    errors.push({ field: 'full_name', message: 'שם מלא הוא שדה חובה' });
  } else if (full_name.trim().length > 150) {
    errors.push({ field: 'full_name', message: 'שם מלא לא יכול לעלות על 150 תווים' });
  }

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'אימייל הוא שדה חובה' });
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.push({ field: 'email', message: 'אימייל לא תקין' });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', message: 'סיסמה היא שדה חובה' });
  }

  if (!role || typeof role !== 'string') {
    errors.push({ field: 'role', message: 'תפקיד הוא שדה חובה' });
  } else if (!VALID_ROLES.has(role)) {
    errors.push({ field: 'role', message: 'תפקיד לא תקין. ערכים מותרים: employee, admin' });
  }

  return { valid: errors.length === 0, errors };
}

function validateLogin({ email, password } = {}) {
  const errors = [];

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'אימייל הוא שדה חובה' });
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.push({ field: 'email', message: 'אימייל לא תקין' });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', message: 'סיסמה היא שדה חובה' });
  }

  return { valid: errors.length === 0, errors };
}

// Validates fields for PUT /api/users/:id; full_name/email/role required, password optional
function validateUpdateUser({ full_name, email, role } = {}) {
  const errors = [];

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
    errors.push({ field: 'full_name', message: 'שם מלא הוא שדה חובה' });
  } else if (full_name.trim().length > 150) {
    errors.push({ field: 'full_name', message: 'שם מלא לא יכול לעלות על 150 תווים' });
  }

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'אימייל הוא שדה חובה' });
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.push({ field: 'email', message: 'אימייל לא תקין' });
  }

  if (!role || typeof role !== 'string') {
    errors.push({ field: 'role', message: 'תפקיד הוא שדה חובה' });
  } else if (!VALID_ROLES.has(role)) {
    errors.push({ field: 'role', message: 'תפקיד לא תקין. ערכים מותרים: employee, admin' });
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateUser, validateLogin, validateUpdateUser };
