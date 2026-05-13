'use strict';

// Provide env vars required by module-level guards before any test file imports them
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-used-only-in-jest-at-least-32-chars!!';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/test';
