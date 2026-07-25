import * as authRepository from "./auth.repository.js";
import { hashPassword, comparePassword } from "../common/utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../common/utils/jwt.js";

/**
 * Register a new user
 * Handles email/phone uniqueness check, password hashing, user insertion,
 * automatic host_profile creation if role includes "host", and JWT generation.
 * PRD Section 11.1 & 16.1
 *
 * @param {Object} userData
 * @returns {Promise<Object>}
 */
export const register = async (userData) => {
  const { full_name, email, phone, password, role = "seeker", roles } = userData;

  // Validate presence of email or phone
  if (!email && !phone) {
    throw new Error("Email or phone number is required.");
  }

  // Normalize roles input (support array or single string)
  const userRoles = roles || (Array.isArray(role) ? role : [role]);

  // Check if email already exists
  if (email) {
    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new Error("Email already registered.");
    }
  }

  // Check if phone already exists
  if (phone) {
    const existingPhone = await authRepository.findUserByPhone(phone);
    if (existingPhone) {
      throw new Error("Phone number already registered.");
    }
  }

  // Hash user password
  const password_hash = await hashPassword(password);

  // Insert user into database
  const user = await authRepository.createUser({
    full_name,
    email,
    phone,
    password_hash,
    role: userRoles[0],
    roles: userRoles,
  });

  // Automatically initialize host profile if registering as a host
  if (userRoles.includes("host")) {
    const existingHostProfile = await authRepository.findHostProfileByUserId(user.id);
    if (!existingHostProfile) {
      await authRepository.createHostProfile(user.id);
    }
  }

  // Generate auth tokens
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    message: "User registered successfully.",
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      roles: user.roles,
      is_verified: user.is_verified,
      accessToken,
      refreshToken,
    },
  };
};

/**
 * Login user
 * Verifies email/phone credentials, checks password match, and returns tokens.
 * PRD Section 11.1
 *
 * @param {Object} credentials
 * @returns {Promise<Object>}
 */
export const login = async ({ email, phone, password }) => {
  if (!email && !phone) {
    throw new Error("Email or phone number is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  // Fetch user by email or phone
  const user = await authRepository.findUserByEmailOrPhone({ email, phone });
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  // Verify password hash
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
  }

  // Ensure user has host profile if they hold host role
  const userRoles = user.roles || [user.role];
  if (userRoles.includes("host")) {
    const hostProfile = await authRepository.findHostProfileByUserId(user.id);
    if (!hostProfile) {
      await authRepository.createHostProfile(user.id);
    }
  }

  // Generate auth tokens
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    roles: userRoles,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    message: "Login successful.",
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      roles: userRoles,
      is_verified: user.is_verified,
      accessToken,
      refreshToken,
    },
  };
};

/**
 * Refresh Access Token
 * Validates refresh token, retrieves user, and issues a fresh token pair.
 * PRD Section 11.1 & 16.1
 *
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
export const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required.");
  }

  // Verify signature and expiration of refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Retrieve user to make sure account still exists
  const user = await authRepository.findUserById(decoded.id);
  if (!user) {
    throw new Error("User not found.");
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles || [user.role],
  };

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};
