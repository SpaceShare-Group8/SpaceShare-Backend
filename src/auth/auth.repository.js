import pool from "../common/config/db.js";

/**
 * Find user by email.
 */
export const findUserByEmail = async (email) => {
  if (!email) return null;

  const query = `
    SELECT *
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [email.toLowerCase()]);
  return rows[0] || null;
};

/**
 * Find user by phone number.
 */
export const findUserByPhone = async (phone) => {
  if (!phone) return null;

  const query = `
    SELECT *
    FROM users
    WHERE phone = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [phone]);
  return rows[0] || null;
};

/**
 * Find user by ID.
 */
export const findUserById = async (id) => {
  if (!id) return null;

  const query = `
    SELECT
      id,
      full_name,
      email,
      phone,
      role,
      is_verified,
      created_at,
      updated_at
    FROM users
    WHERE id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

/**
 * Create a new user.
 */
export const createUser = async ({
  full_name,
  email,
  phone,
  password_hash,
  role = "seeker",
}) => {
  const query = `
    INSERT INTO users (
      full_name,
      email,
      phone,
      password_hash,
      role
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      full_name,
      email,
      phone,
      role,
      is_verified,
      created_at,
      updated_at;
  `;

  const values = [
    full_name,
    email ? email.toLowerCase() : null,
    phone || null,
    password_hash,
    role,
  ];

  const { rows } = await pool.query(query, values);

  return rows[0];
};

/**
 * Find user by email or phone.
 */
export const findUserByEmailOrPhone = async ({ email, phone }) => {
  if (!email && !phone) return null;

  let query;
  let values;

  if (email) {
    query = `
      SELECT *
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
    `;

    values = [email.toLowerCase()];
  } else {
    query = `
      SELECT *
      FROM users
      WHERE phone = $1
      LIMIT 1;
    `;

    values = [phone];
  }

  const { rows } = await pool.query(query, values);

  return rows[0] || null;
};

/**
 * Verify user account.
 */
export const verifyUser = async (id) => {
  if (!id) return null;

  const query = `
    UPDATE users
    SET
      is_verified = TRUE,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      full_name,
      email,
      is_verified,
      updated_at;
  `;

  const { rows } = await pool.query(query, [id]);

  return rows[0] || null;
};

/**
 * Update password.
 */
export const updatePassword = async (id, password_hash) => {
  if (!id || !password_hash) return null;

  const query = `
    UPDATE users
    SET
      password_hash = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING
      id,
      email,
      updated_at;
  `;

  const { rows } = await pool.query(query, [password_hash, id]);

  return rows[0] || null;
};

/**
 * Find user for password reset.
 */
export const findUserForPasswordReset = async (email) => {
  if (!email) return null;

  const query = `
    SELECT
      id,
      full_name,
      email
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [email.toLowerCase()]);

  return rows[0] || null;
};

/**
 * Find host profile.
 */
export const findHostProfileByUserId = async (userId) => {
  if (!userId) return null;

  const query = `
    SELECT *
    FROM host_profiles
    WHERE user_id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows[0] || null;
};

/**
 * Create host profile.
 */
export const createHostProfile = async (userId) => {
  if (!userId) {
    throw new Error("userId is required to create a host profile.");
  }

  const query = `
    INSERT INTO host_profiles (user_id)
    VALUES ($1)
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows[0];
};