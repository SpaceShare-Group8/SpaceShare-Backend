import pool from "../common/config/db.js";

/**
 * Find a user by email.
 *
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export const findUserByEmail = async (email) => {
  const query = `
    SELECT *
    FROM users
    WHERE email = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [email]);

  return rows[0] || null;
};

/**
 * Find a user by phone number.
 *
 * @param {string} phone
 * @returns {Promise<Object|null>}
 */
export const findUserByPhone = async (phone) => {
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
 * Find a user by ID.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const findUserById = async (id) => {
  const query = `
    SELECT *
    FROM users
    WHERE id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [id]);

  return rows[0] || null;
};

/**
 * Create a new user.
 *
 * @param {Object} user
 * @returns {Promise<Object>}
 */
export const createUser = async ({
  full_name,
  email,
  phone,
  password_hash,
  role,
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
    email || null,
    phone || null,
    password_hash,
    role,
  ];

  const { rows } = await pool.query(query, values);

  return rows[0];
};

/**
 * Find a user using either email or phone.
 *
 * @param {Object} credentials
 * @returns {Promise<Object|null>}
 */
export const findUserByEmailOrPhone = async ({
  email,
  phone,
}) => {
  let query = "";
  let values = [];

  if (email) {
    query = `
      SELECT *
      FROM users
      WHERE email = $1
      LIMIT 1;
    `;
    values = [email];
  } else if (phone) {
    query = `
      SELECT *
      FROM users
      WHERE phone = $1
      LIMIT 1;
    `;
    values = [phone];
  } else {
    return null;
  }

  const { rows } = await pool.query(query, values);

  return rows[0] || null;
};

/**
 * Mark a user as verified.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const verifyUser = async (id) => {
  const query = `
    UPDATE users
    SET
      is_verified = TRUE,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [id]);

  return rows[0] || null;
};

/**
 * Update a user's password.
 *
 * @param {string} id
 * @param {string} password_hash
 * @returns {Promise<Object|null>}
 */
export const updatePassword = async (
  id,
  password_hash
) => {
  const query = `
    UPDATE users
    SET
      password_hash = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [
    password_hash,
    id,
  ]);

  return rows[0] || null;
};