import {
  findUserByEmail,
  findUserByPhone,
  findUserById,
  createUser,
} from "./auth.repository.js";

import {
  hashPassword,
  comparePassword,
} from "../common/utils/password.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../common/utils/jwt.js";

/**
 * Register a new user
 */
export const register = async (userData) => {
  const {
    full_name,
    email,
    phone,
    password,
    role = "seeker",
  } = userData;

  // Ensure either email or phone is provided
  if (!email && !phone) {
    throw new Error("Email or phone number is required.");
  }

  // Check email uniqueness
  if (email) {
    const existingEmail = await findUserByEmail(email);

    if (existingEmail) {
      throw new Error("Email already exists.");
    }
  }

  // Check phone uniqueness
  if (phone) {
    const existingPhone = await findUserByPhone(phone);

    if (existingPhone) {
      throw new Error("Phone number already exists.");
    }
  }

  // Validate role
  const allowedRoles = [
    "seeker",
    "host",
    "corporate_admin",
    "admin",
  ];

  if (!allowedRoles.includes(role)) {
    throw new Error("Invalid user role.");
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Create user
  const user = await createUser({
    full_name,
    email,
    phone,
    password_hash,
    role,
  });

  return {
    message: "User registered successfully.",
    user,
  };
};

/**
 * Login user
 */
export const login = async ({ email, phone, password }) => {
  if (!email && !phone) {
    throw new Error("Email or phone number is required.");
  }

  let user;

  if (email) {
    user = await findUserByEmail(email);
  } else {
    user = await findUserByPhone(phone);
  }

  if (!user) {
    throw new Error("Invalid credentials.");
  }

  const isPasswordValid = await comparePassword(
    password,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new Error("Invalid credentials.");
  }

  const accessToken = generateAccessToken(user);

  const refreshToken = generateRefreshToken(user);

  return {
    message: "Login successful.",
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_verified: user.is_verified,
    },
  };
};

/**
 * Refresh Access Token
 */
export const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required.");
  }

  const decoded = verifyRefreshToken(refreshToken);

  const user = await findUserById(decoded.id);

  if (!user) {
    throw new Error("User not found.");
  }

  const accessToken = generateAccessToken(user);

  const newRefreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};