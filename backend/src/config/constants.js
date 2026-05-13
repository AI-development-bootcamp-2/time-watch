'use strict';

const BCRYPT_COST = 12;

const ROLES = {
  EMPLOYEE: 'employee',
  PROJECT_MANAGER: 'project_manager',
  ADMIN: 'admin',
};

module.exports = { BCRYPT_COST, ROLES };
