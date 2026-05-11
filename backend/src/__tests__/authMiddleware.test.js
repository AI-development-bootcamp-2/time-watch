'use strict';

process.env.JWT_SECRET = 'test-secret-used-only-in-jest-at-least-32-chars!!';

jest.mock('../utils/jwt');

const { verifyToken } = require('../utils/jwt');
const { authenticate, requireRole } = require('../middleware/auth');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

describe('authenticate middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — calls next(UnauthorizedError) when token cookie is missing', () => {
    const req = { cookies: {} };
    const next = jest.fn();

    authenticate(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('401 — calls next(UnauthorizedError) when token is expired', () => {
    const { TokenExpiredError } = jest.requireActual('jsonwebtoken');
    verifyToken.mockImplementation(() => {
      throw new TokenExpiredError('jwt expired', new Date());
    });
    const req = { cookies: { token: 'expired.jwt.token' } };
    const next = jest.fn();

    authenticate(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('401 — calls next(UnauthorizedError) when token signature is invalid', () => {
    const { JsonWebTokenError } = jest.requireActual('jsonwebtoken');
    verifyToken.mockImplementation(() => {
      throw new JsonWebTokenError('invalid signature');
    });
    const req = { cookies: { token: 'bad.signature.token' } };
    const next = jest.fn();

    authenticate(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('500 — unexpected error from verifyToken is not swallowed as 401', () => {
    verifyToken.mockImplementation(() => { throw new Error('unexpected internal error'); });
    const req = { cookies: { token: 'some.jwt.token' } };
    const next = jest.fn();

    authenticate(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).not.toBeInstanceOf(UnauthorizedError);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('valid token — attaches req.user from payload and calls next() with no arguments', () => {
    verifyToken.mockReturnValue({ sub: 'user-uuid-123', role: 'employee' });
    const req = { cookies: { token: 'valid.jwt.token' } };
    const next = jest.fn();

    authenticate(req, {}, next);

    expect(req.user).toEqual({ id: 'user-uuid-123', role: 'employee' });
    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireRole middleware', () => {
  it('401 — calls next(UnauthorizedError) when req.user is undefined', () => {
    const next = jest.fn();

    requireRole('admin')({ cookies: {} }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('403 — calls next(ForbiddenError) when role is not in the allowed list', () => {
    const next = jest.fn();

    requireRole('admin')({ user: { id: 'u1', role: 'employee' } }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  it('allowed single role — calls next() with no arguments', () => {
    const next = jest.fn();

    requireRole('admin')({ user: { id: 'u1', role: 'admin' } }, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('multiple allowed roles — first role passes', () => {
    const next = jest.fn();

    requireRole('admin', 'manager')({ user: { id: 'u1', role: 'admin' } }, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('multiple allowed roles — second role passes', () => {
    const next = jest.fn();

    requireRole('admin', 'manager')({ user: { id: 'u1', role: 'manager' } }, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('403 — req.body.role is ignored; only req.user.role is checked', () => {
    const next = jest.fn();

    requireRole('admin')({ user: { id: 'u1', role: 'employee' }, body: { role: 'admin' } }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  it('403 — role undefined in token payload is treated as non-matching', () => {
    const next = jest.fn();

    requireRole('admin')({ user: { id: 'u1', role: undefined } }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  it('403 — empty roles list blocks any authenticated user', () => {
    const next = jest.fn();

    requireRole()({ user: { id: 'u1', role: 'admin' } }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });
});
