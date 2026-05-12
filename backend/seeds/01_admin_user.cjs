const bcrypt = require('bcrypt');

exports.seed = async (knex) => {
  const existing = await knex('users').where({ email: 'admin@timewatch.local' }).first();
  if (existing) return;

  const password_hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin1234!', 10);
  await knex('users').insert({
    email: 'admin@timewatch.local',
    password_hash,
    full_name: 'מנהל מערכת',
    role: 'admin',
    is_active: true,
  });
};
