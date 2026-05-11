'use strict';

process.env.JWT_SECRET = 'test-secret-used-only-in-jest-at-least-32-chars!!';

jest.mock('../utils/jwt');

const { verifyToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { UnauthorizedError } = require('../utils/errors');

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

  it('valid token — attaches req.user from payload and calls next() with no arguments', () => {
    verifyToken.mockReturnValue({ sub: 'user-uuid-123', role: 'employee' });
    const req = { cookies: { token: 'valid.jwt.token' } };
    const next = jest.fn();

    authenticate(req, {}, next);

    expect(req.user).toEqual({ id: 'user-uuid-123', role: 'employee' });
    expect(next).toHaveBeenCalledWith();
  });
});
