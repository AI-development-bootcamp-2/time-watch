'use strict';

process.env.JWT_SECRET = 'test-secret-used-only-in-jest-at-least-32-chars!!';

jest.mock('../repositories/usersRepository');
jest.mock('../db/knex', () => ({ db: { transaction: jest.fn() } }));

const usersRepository = require('../repositories/usersRepository');
const { db } = require('../db/knex');
const { createUser, deactivateUser } = require('../services/usersService');
const { PasswordComplexityError, BadRequestError } = require('../utils/errors');

describe('createUser unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('4.4 — stores bcrypt hash (not plain password), sets must_change_password: true, returns repo row', async () => {
    const fakeRow = {
      id: 1,
      full_name: 'ישראל ישראלי',
      email: 'israel@example.com',
      role: 'employee',
      is_active: true,
      must_change_password: true,
      created_at: new Date(),
    };
    usersRepository.create.mockResolvedValue(fakeRow);

    const result = await createUser({
      full_name: 'ישראל ישראלי',
      email: 'israel@example.com',
      password: 'Temp1234!',
      role: 'employee',
    });

    const callArg = usersRepository.create.mock.calls[0][0];
    expect(callArg).not.toHaveProperty('password');
    expect(callArg.password_hash).toMatch(/^\$2b\$/);
    expect(callArg.must_change_password).toBe(true);
    expect(result).toEqual(fakeRow);
  });

  it('throws PasswordComplexityError before calling repository when password is weak', async () => {
    await expect(
      createUser({ full_name: 'Test', email: 'test@example.com', password: 'weak', role: 'employee' })
    ).rejects.toBeInstanceOf(PasswordComplexityError);
    expect(usersRepository.create).not.toHaveBeenCalled();
  });
});

describe('deactivateUser unit', () => {
  let mockTrx;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrx = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    // Simulate Knex transaction: commit on resolve, rollback on throw
    db.transaction.mockImplementation(async (cb) => {
      try {
        const result = await cb(mockTrx);
        await mockTrx.commit();
        return result;
      } catch (err) {
        await mockTrx.rollback();
        throw err;
      }
    });
  });

  it('6.7 — last active admin → throws BadRequestError, setActiveTx never called', async () => {
    usersRepository.lockUserForUpdate.mockResolvedValue({ id: 1, role: 'admin', is_active: true });
    usersRepository.lockActiveAdmins.mockResolvedValue([{ id: 1 }]);

    await expect(deactivateUser(1)).rejects.toBeInstanceOf(BadRequestError);
    expect(usersRepository.setActiveTx).not.toHaveBeenCalled();
  });

  it('6.8 — last active admin → transaction rolled back, never committed', async () => {
    usersRepository.lockUserForUpdate.mockResolvedValue({ id: 1, role: 'admin', is_active: true });
    usersRepository.lockActiveAdmins.mockResolvedValue([{ id: 1 }]);

    await expect(deactivateUser(1)).rejects.toBeInstanceOf(BadRequestError);
    expect(mockTrx.rollback).toHaveBeenCalledTimes(1);
    expect(mockTrx.commit).not.toHaveBeenCalled();
  });
});
