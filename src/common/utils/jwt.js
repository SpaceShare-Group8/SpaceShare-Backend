/* Module imports */
import jwt from "jsonwebtoken";

/* Environment Variable Configuration with Fallbacks */
const ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "default_access_secret";
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET || "default_refresh_secret";
const PASSWORD_RESET_SECRET =
  process.env.JWT_PASSWORD_RESET_SECRET || "default_reset_secret";
const INVITE_TOKEN_SECRET =
  process.env.JWT_INVITE_SECRET || process.env.JWT_SECRET || "default_invite_secret";

const ACCESS_TOKEN_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRY || "7d";
const PASSWORD_RESET_EXPIRES_IN =
  process.env.JWT_PASSWORD_RESET_EXPIRES_IN || "15m";
const INVITE_TOKEN_EXPIRES_IN =
  process.env.JWT_INVITE_EXPIRES_IN || "7d";

/*
 * Normalizes user roles into a consistent array structure.
 * Supports single strings, arrays, and fallback defaults.
 */
const normalizeRoles = (userOrPayload) => {
  if (Array.isArray(userOrPayload.roles) && userOrPayload.roles.length > 0) {
    return userOrPayload.roles;
  }
  if (userOrPayload.role) {
    return [userOrPayload.role];
  }
  return ["seeker"];
};

/*
 * Generate Access Token
 * Formats payload to include ID, email, normalized roles, and corporate account details if present.
 */
export const generateAccessToken = (userOrPayload) => {
  const payload = {
    id: userOrPayload.id || userOrPayload._id,
    email: userOrPayload.email,
    roles: normalizeRoles(userOrPayload),
    /* Attach corporate metadata if the user belongs to a corporate account */
    ...(userOrPayload.corporateAccountId && {
      corporateAccountId: userOrPayload.corporateAccountId,
    }),
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
};

/*
 * Verify Access Token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

/*
 * Generate Refresh Token
 */
export const generateRefreshToken = (userOrPayload) => {
  return jwt.sign(
    { id: userOrPayload.id || userOrPayload._id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

/*
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};

/*
 * Generate Password Reset Token
 */
export const generatePasswordResetToken = (userOrPayload) => {
  return jwt.sign(
    { id: userOrPayload.id || userOrPayload._id, email: userOrPayload.email },
    PASSWORD_RESET_SECRET,
    { expiresIn: PASSWORD_RESET_EXPIRES_IN }
  );
};

/*
 * Verify Password Reset Token
 */
export const verifyPasswordResetToken = (token) => {
  return jwt.verify(token, PASSWORD_RESET_SECRET);
};

/*
 * Generate Employee Invite Token
 */
export const generateEmployeeInviteToken = (payload) => {
  return jwt.sign(payload, INVITE_TOKEN_SECRET, {
    expiresIn: INVITE_TOKEN_EXPIRES_IN,
  });
};

/*
 * Verify Employee Invite Token
 */
export const verifyEmployeeInviteToken = (token) => {
  return jwt.verify(token, INVITE_TOKEN_SECRET);
};

/*
 * Decode Token without verification (useful for client-side inspection or pre-checks)
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};