'use strict';

const bcrypt = require('bcrypt');
const usersRepository = require('../repositories/usersRepository');
const { signToken } = require('../utils/jwt');
const {
  InvalidCredentialsError, AccountLockedError, AccountInactiveError,
  UnauthorizedError, PasswordComplexityError, PasswordReuseError,
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

  // Intentional enumeration trade-off: we reveal ACCOUNT_INACTIVE only when the
  // password is correct. An attacker who already knows the password gains nothing
  // new; an attacker who doesn't will receive INVALID_CREDENTIALS (401) before
  // reaching this point. For this internal, admin-managed app the UX benefit of
  // a clear "account is inactive" message outweighs the marginal disclosure risk.
  if (!user.is_active) {
    throw new AccountInactiveError();
  }

  await usersRepository.resetLockout(user.id);

  const token = signToken({ sub: user.id, role: user.role });

  const { password_hash, failed_attempts, locked_until, deleted_at, ...safeUser } = user;
  return { token, user: safeUser };
}

// Verifies current password, validates and hashes new password, updates DB and clears must_change_password.
// Lockout behaviour intentionally mirrors login: wrong current_password increments failed_attempts and
// eventually locks the account for 15 minutes after MAX_FAILED_ATTEMPTS consecutive failures.
// Because userId comes from a verified JWT (not user-supplied input), checking lockout before bcrypt
// carries no enumeration risk and avoids the expensive hash when the account is already locked.
async function changePassword(userId, { current_password, new_password }) {
  const user = await usersRepository.findByIdFull(userId);
  if (!user) throw new UnauthorizedError();

  // Check lockout before expensive bcrypt — userId is known from JWT so no enumeration risk
  if (user.locked_until && user.locked_until > new Date()) {
    const minutesRemaining = Math.ceil((user.locked_until - new Date()) / (60 * 1000));
    throw new AccountLockedError(minutesRemaining);
  }

  const match = await bcrypt.compare(current_password, user.password_hash);
  if (!match) {
    // Mirror login: increment counter; locks after MAX_FAILED_ATTEMPTS wrong attempts
    await usersRepository.incrementFailedAttempts(userId);
    throw new UnauthorizedError('סיסמה נוכחית שגויה');
  }

  // Block deactivated users even with a valid JWT (token may have been issued before deactivation)
  if (!user.is_active) throw new AccountInactiveError();

  // Reject reuse of the current password — distinct from complexity failures (PASSWORD_REUSE vs PASSWORD_COMPLEXITY)
  const isSamePassword = await bcrypt.compare(new_password, user.password_hash);
  if (isSamePassword) {
    throw new PasswordReuseError();
  }

  validatePasswordComplexity(new_password, 'new_password');

  const newHash = await bcrypt.hash(new_password, BCRYPT_COST);
  await usersRepository.updatePassword(userId, newHash);
  await usersRepository.resetLockout(userId); // ISSUE-06: reset counter on successful change
}

module.exports = { login, changePassword };
