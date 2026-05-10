const bcrypt = require("bcrypt");

exports.seed = async function (knex) {
  // Deletes ALL existing entries to ensure idempotency for the admin user
  // We use the email to identify the admin user.
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  
  await knex("users").where({ email }).del();

  let passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!passwordHash) {
    passwordHash = await bcrypt.hash("Admin123!", 10);
  }

  await knex("users").insert([
    {
      full_name: "System Admin",
      email: email,
      password_hash: passwordHash,
      role: "admin",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
};
