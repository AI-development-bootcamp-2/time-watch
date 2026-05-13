'use strict';

const jwt = require('jsonwebtoken');

function adminCookie() {
  const token = jwt.sign(
    { sub: 'test-admin-id', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `token=${token}`;
}

function employeeCookie() {
  const token = jwt.sign(
    { sub: 'test-employee-id', role: 'employee' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `token=${token}`;
}

function projectManagerCookie() {
  const token = jwt.sign(
    { sub: 'test-pm-id', role: 'project_manager' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `token=${token}`;
}

module.exports = { adminCookie, employeeCookie, projectManagerCookie };
