import pool from "../common/config/db.js";

/**
 * Find a user by email (Case-Insensitive).
 * PRD Section 11.1
 *
 * @param {string} email
 * @returns {Promise<Object|null>}
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
 * Find a user by phone number.
 *
 * @param {string} phone
 * @returns {Promise<Object|null>}
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
 * Find a user by ID.
 * Excludes sensitive fields like password_hash.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const findUserById = async (id) => {
  if (!id) return null;
  const query = `
    SELECT id, full_name, email, phone, role, roles, is_verified, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

/**
 * Create a new user.
 * Supports multi-role arrays per SpaceShare PRD Section 9 & 14.
 *
 * @param {Object} user
 * @returns {Promise<Object>}
 */
export const createUser = async ({
  full_name,
  email,
  phone,
  password_hash,
  role = "seeker",
  roles,
}) => {
  // Normalize roles: prioritize roles array, fallback to single role string
  const userRoles = roles || (Array.isArray(role) ? role : [role]);
  const primaryRole = userRoles[0] || "seeker";

  const query = `
    INSERT INTO users (
      full_name,
      email,
      phone,
      password_hash,
      role,
      roles
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      full_name,
      email,
      phone,
      role,
      roles,
      is_verified,
      created_at,
      updated_at;
  `;

  const values = [
    full_name,
    email ? email.toLowerCase() : null,
    phone || null,
    password_hash,
    primaryRole,
    userRoles,
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
export const findUserByEmailOrPhone = async ({ email, phone }) => {
  if (!email && !phone) return null;

  let query = "";
  let values = [];

  if (email) {
    query = `
      SELECT *
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
    `;
    values = [email.toLowerCase()];
  } else if (phone) {
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
 * Mark a user as verified.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const verifyUser = async (id) => {
  if (!id) return null;
  const query = `
    UPDATE users
    SET
      is_verified = TRUE,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, full_name, email, is_verified, updated_at;
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
export const updatePassword = async (id, password_hash) => {
  if (!id || !password_hash) return null;
  const query = `
    UPDATE users
    SET
      password_hash = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING id, updated_at;
  `;

  const { rows } = await pool.query(query, [password_hash, id]);
  return rows[0] || null;
};

/**
 * Get a host profile by user ID.
 *
 * @param {string} userId
 * @returns {Promise<Object|null>}
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
 * Create a host profile.
 *
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const createHostProfile = async (userId) => {
  if (!userId) throw new Error("userId is required to create a host profile.");
  const query = `
    INSERT INTO host_profiles (user_id)
    VALUES ($1)
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0];
};
