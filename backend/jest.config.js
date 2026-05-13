'use strict';

// All test files share the same PostgreSQL database and call migrate.rollback + migrate.latest
// in beforeAll/afterAll. Running them in parallel workers causes race conditions on migrations.
// --runInBand (maxWorkers: 1) keeps execution serial.
module.exports = {
  testEnvironment: 'node',
  maxWorkers: 1,
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    'src/__tests__/helpers/',
    'src/__tests__/authService.test.js',
    'src/__tests__/auth.routes.test.js',
    'src/__tests__/users.routes.test.js',
    'src/__tests__/usersRepository.test.js',
    'src/__tests__/adminRoutes.guard.test.js',
    'src/db/db-build.test.js',
    'src/db/migration.test.js',
    'src/routes/absences.test.js',
  ],
};
