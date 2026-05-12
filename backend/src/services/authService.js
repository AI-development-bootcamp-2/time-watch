'use strict';

const bcrypt = require('bcrypt');
const usersRepository = require('../repositories/usersRepository');
const { signToken } = require('../utils/jwt');
const {
  InvalidCredentialsError, AccountLockedError, AccountInactiveError,
  UnauthorizedError, PasswordComplexityError,
} = require('../utils/errors');

const BCRYPT_COST = 12;

// Validates new_password complexity; throws PasswordComplexityError listing unmet rules
function checkNewPasswordComplexity(password) {
  const missing = [];
  if (password.length < 8)             missing.push('לפחות 8 תווים');
  if (!/[A-Z]/.test(password))         missing.push('אות גדולה אחת לפחות');
  if (!/[a-z]/.test(password))         missing.push('אות קטנה אחת לפחות');
  if (!/\d/.test(password))            missing.push('ספרה אחת לפחות');
  if (!/[^A-Za-z0-9]/.test(password))  missing.push('תו מיוחד אחד לפחות');
  if (missing.length > 0) {
    throw new PasswordComplexityError([{ field: 'new_password', message: `הסיסמה חייבת לכלול: ${missing.join(', ')}` }]);
  }
}

// A validly-formatted bcrypt hash used only to run a constant-time comparison when no
// user is found for the given email. This prevents an attacker from distinguishing
// "email not registered" from "wrong password" via response-time differences.
const DUMMY_HASH = '$2b$12$LCGkLdR4exGGhQUDi4Mk8uhaTr4R1K1HYzMMpXE.jqNcbf9AhvzI6';

async function login({ email, password }) {
  const user = await usersRepository.findByEmail(email);

  // Always run bcrypt — against the real hash or a dummy — before branching.
  const passwordMatch = await bcrypt.compare(
    password,
    user ? user.password_hash : DUMMY_HASH
  );

  if (!user) {
    throw new InvalidCredentialsError();
  }

  if (user.locked_until && user.locked_until > new Date()) {
    const minutesRemaining = Math.ceil((user.locked_until - new Date()) / (60 * 1000));
    throw new AccountLockedError(minutesRemaining);
  }

  if (!passwordMatch) {
    await usersRepository.incrementFailedAttempts(user.id);
    throw new InvalidCredentialsError();
  }

  if (!user.is_active) {
    throw new AccountInactiveError();
  }

  await usersRepository.resetLockout(user.id);

  const token = signToken({ sub: user.id, role: user.role });

  const { password_hash, failed_attempts, locked_until, deleted_at, ...safeUser } = user;
  return { token, user: safeUser };
}

// Verifies current password, validates and hashes new password, updates DB and clears must_change_password
async function changePassword(userId, { current_password, new_password }) {
  const user = await usersRepository.findByIdFull(userId);
  if (!user) throw new UnauthorizedError();

  const match = await bcrypt.compare(current_password, user.password_hash);
  if (!match) throw new UnauthorizedError('סיסמה נוכחית שגויה');

  checkNewPasswordComplexity(new_password);

  const newHash = await bcrypt.hash(new_password, BCRYPT_COST);
  await usersRepository.updatePassword(userId, newHash);
}

module.exports = { login, changePassword };
