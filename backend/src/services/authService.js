'use strict';

const bcrypt = require('bcrypt');
const usersRepository = require('../repositories/usersRepository');
const { signToken } = require('../utils/jwt');
const { InvalidCredentialsError, AccountLockedError } = require('../utils/errors');

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

  await usersRepository.resetLockout(user.id);

  const token = signToken({ sub: user.id, role: user.role });

  const { password_hash, failed_attempts, locked_until, deleted_at, ...safeUser } = user;
  return { token, user: safeUser };
}

module.exports = { login };
