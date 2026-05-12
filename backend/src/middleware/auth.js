'use strict';

const { TokenExpiredError, JsonWebTokenError } = require('jsonwebtoken');
const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

// Validates JWT signature and expiry only — no DB round-trip.
//
// Security trade-off (intentional for this internal, admin-managed app):
//   • Only /me and /change-password re-check the user against the DB (via findById /
//     findByIdFull).  All other protected routes — including every admin CRUD endpoint —
//     trust the JWT alone.
//   • Consequence: a deactivated or soft-deleted user whose token has not yet expired
//     can still reach those routes.  The effective revocation window is the JWT lifetime
//     (8 h); the short lifetime makes this acceptable.
//   • Rationale: adding a DB lookup to every request would increase latency on every API
//     call and is not warranted for the current scope.
//
// When a DB check IS performed (findById / findByIdFull), it targets users.id (the
// primary key, always indexed) and is never duplicated within the same request chain.
function authenticate(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return next(new UnauthorizedError());

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
      return next(new UnauthorizedError());
    }
    next(err);
  }
}

// Guards routes by role — usage: requireRole('admin') or requireRole('admin', 'manager')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}

module.exports = { authenticate, requireRole };
