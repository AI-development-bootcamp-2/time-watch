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
  } else {
    const missing = [];
    if (password.length < 8)          missing.push('לפחות 8 תווים');
    if (!/[A-Z]/.test(password))      missing.push('אות גדולה אחת לפחות');
    if (!/[a-z]/.test(password))      missing.push('אות קטנה אחת לפחות');
    if (!/\d/.test(password))         missing.push('ספרה אחת לפחות');
    if (!/[^A-Za-z0-9]/.test(password)) missing.push('תו מיוחד אחד לפחות');
    if (missing.length > 0) {
      errors.push({ field: 'password', message: `הסיסמה חייבת לכלול: ${missing.join(', ')}` });
    }
  }

  if (!role || typeof role !== 'string') {
    errors.push({ field: 'role', message: 'תפקיד הוא שדה חובה' });
  } else if (!VALID_ROLES.has(role)) {
    errors.push({ field: 'role', message: 'תפקיד לא תקין. ערכים מותרים: employee, admin' });
  }

  return errors;
}

module.exports = { validateCreateUser };
