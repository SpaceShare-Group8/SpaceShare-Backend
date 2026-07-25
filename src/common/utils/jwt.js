import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "default_access_secret";
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET || "default_refresh_secret";
const PASSWORD_RESET_SECRET =
  process.env.JWT_PASSWORD_RESET_SECRET || "default_reset_secret";

const ACCESS_TOKEN_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRY || "7d";
const PASSWORD_RESET_EXPIRES_IN =
  process.env.JWT_PASSWORD_RESET_EXPIRES_IN || "15m";

/**
 * Generate Access Token
 * Accepts either a user model instance or a plain payload object
 */
export const generateAccessToken = (userOrPayload) => {
  const payload = {
    id: userOrPayload.id,
    email: userOrPayload.email,
    roles: Array.isArray(userOrPayload.roles)
      ? userOrPayload.roles
      : userOrPayload.role
      ? [userOrPayload.role]
      : ["seeker"],
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

/**
 * Generate Refresh Token
 */
export const generateRefreshToken = (userOrPayload) => {
  return jwt.sign(
    { id: userOrPayload.id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};

/**
 * Generate Password Reset Token
 */
export const generatePasswordResetToken = (userOrPayload) => {
  return jwt.sign(
    { id: userOrPayload.id, email: userOrPayload.email },
    PASSWORD_RESET_SECRET,
    { expiresIn: PASSWORD_RESET_EXPIRES_IN }
  );
};

/**
 * Verify Password Reset Token
 */
export const verifyPasswordResetToken = (token) => {
  return jwt.verify(token, PASSWORD_RESET_SECRET);
};
