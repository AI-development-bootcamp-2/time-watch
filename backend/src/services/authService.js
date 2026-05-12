'use strict';

const bcrypt = require('bcrypt');
const usersRepository = require('../repositories/usersRepository');
const { signToken } = require('../utils/jwt');
const {
  InvalidCredentialsError, AccountLockedError, AccountInactiveError,
  UnauthorizedError, PasswordComplexityError,
} = require('../utils/errors');
const { validatePasswordComplexity } = require('../utils/validate');
const { BCRYPT_COST } = require('../config/constants');

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

  // ISSUE-06: check lockout before expensive bcrypt (userId is known from JWT — no enumeration risk)
  if (user.locked_until && user.locked_until > new Date()) {
    const minutesRemaining = Math.ceil((user.locked_until - new Date()) / (60 * 1000));
    throw new AccountLockedError(minutesRemaining);
  }

  const match = await bcrypt.compare(current_password, user.password_hash);
  if (!match) {
    await usersRepository.incrementFailedAttempts(userId); // ISSUE-06: mirror login lockout
    throw new UnauthorizedError('סיסמה נוכחית שגויה');
  }

  if (!user.is_active) throw new AccountInactiveError(); // ISSUE-03: block deactivated users

  // ISSUE-01: reject if new_password is the same as the current one
  const isSamePassword = await bcrypt.compare(new_password, user.password_hash);
  if (isSamePassword) {
    throw new PasswordComplexityError([{ field: 'new_password', message: 'הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית' }]);
  }

  validatePasswordComplexity(new_password, 'new_password');

  const newHash = await bcrypt.hash(new_password, BCRYPT_COST);
  await usersRepository.updatePassword(userId, newHash);
  await usersRepository.resetLockout(userId); // ISSUE-06: reset counter on successful change
}

module.exports = { login, changePassword };
