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

// ================================================================
// OTP METHODS - Added for email verification flow
// ================================================================

/**
 * Update user's OTP code and expiry
 * @param {string} userId - User ID
 * @param {string} otp - 6-digit OTP code
 * @param {Date} otpExpiry - Expiry date for OTP
 * @returns {Promise<Object|null>} - Updated user with OTP fields
 */
export const updateUserOTP = async (userId, otp, otpExpiry) => {
  if (!userId) {
    throw new Error("userId is required to update OTP.");
  }

  if (!otp || otp.length !== 6) {
    throw new Error("Valid 6-digit OTP is required.");
  }

  if (!otpExpiry) {
    throw new Error("OTP expiry date is required.");
  }

  const query = `
    UPDATE users
    SET 
      otp = $1,
      otp_expiry = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING 
      id,
      email,
      full_name,
      otp,
      otp_expiry,
      is_verified,
      updated_at;
  `;

  const { rows } = await pool.query(query, [otp, otpExpiry, userId]);

  if (rows.length === 0) {
    throw new Error("User not found.");
  }

  return rows[0];
};

/**
 * Find user by email with OTP fields included
 * @param {string} email - User's email address
 * @returns {Promise<Object|null>} - User with OTP fields
 */
export const findUserWithOTP = async (email) => {
  if (!email) return null;

  const query = `
    SELECT 
      id,
      full_name,
      email,
      phone,
      role,
      is_verified,
      otp,
      otp_expiry,
      created_at,
      updated_at
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [email.toLowerCase()]);

  return rows[0] || null;
};

/**
 * Verify user with OTP and clear OTP fields
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Verified user
 */
export const verifyUserWithOTP = async (userId) => {
  if (!userId) {
    throw new Error("userId is required to verify with OTP.");
  }

  const query = `
    UPDATE users
    SET 
      is_verified = TRUE,
      otp = NULL,
      otp_expiry = NULL,
      updated_at = NOW()
    WHERE id = $1
      AND is_verified = FALSE
    RETURNING 
      id,
      full_name,
      email,
      phone,
      role,
      is_verified,
      updated_at;
  `;

  const { rows } = await pool.query(query, [userId]);

  if (rows.length === 0) {
    throw new Error("User not found or already verified.");
  }

  return rows[0];
};

/**
 * Clear OTP fields without verifying user (used for expired OTP cleanup)
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Updated user
 */
export const clearUserOTP = async (userId) => {
  if (!userId) {
    throw new Error("userId is required to clear OTP.");
  }

  const query = `
    UPDATE users
    SET 
      otp = NULL,
      otp_expiry = NULL,
      updated_at = NOW()
    WHERE id = $1
    RETURNING 
      id,
      email,
      is_verified,
      updated_at;
  `;

  const { rows } = await pool.query(query, [userId]);

  if (rows.length === 0) {
    throw new Error("User not found.");
  }

  return rows[0];
};

/**
 * Find users with expired OTPs (for cleanup jobs)
 * @param {Date} beforeDate - Date to check expiry against
 * @returns {Promise<Array>} - Array of users with expired OTPs
 */
export const findUsersWithExpiredOTP = async (beforeDate = new Date()) => {
  const query = `
    SELECT 
      id,
      email,
      full_name,
      otp,
      otp_expiry
    FROM users
    WHERE otp IS NOT NULL
      AND otp_expiry < $1
      AND is_verified = FALSE
    ORDER BY otp_expiry ASC;
  `;

  const { rows } = await pool.query(query, [beforeDate]);

  return rows;
};

/**
 * Check if OTP is valid for a user
 * @param {string} userId - User ID
 * @param {string} otp - OTP to verify
 * @returns {Promise<Object>} - { valid: boolean, message: string }
 */
export const checkOTPValidity = async (userId, otp) => {
  if (!userId || !otp) {
    return { valid: false, message: "User ID and OTP are required." };
  }

  const query = `
    SELECT 
      id,
      otp,
      otp_expiry,
      is_verified
    FROM users
    WHERE id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [userId]);

  if (rows.length === 0) {
    return { valid: false, message: "User not found." };
  }

  const user = rows[0];

  if (user.is_verified) {
    return { valid: false, message: "User is already verified." };
  }

  if (!user.otp) {
    return { valid: false, message: "No OTP found. Please request a new one." };
  }

  const now = new Date();
  const expiry = new Date(user.otp_expiry);

  if (now > expiry) {
    return { valid: false, message: "OTP has expired. Please request a new one." };
  }

  if (user.otp !== otp) {
    return { valid: false, message: "Invalid OTP code." };
  }

  return { valid: true, message: "OTP is valid." };
};