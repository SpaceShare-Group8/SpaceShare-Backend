import {
  findUserByEmail,
  findUserByPhone,
  findUserById,
  createUser,
  createHostProfile,
} from "./auth.repository.js";
import { hashPassword, comparePassword } from "../common/utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../common/utils/jwt.js";

/**
 * Register a new user
 * PRD Section 11.1 & Section 14 Schema
 */
export const register = async (userData) => {
  const { full_name, email, phone, password, role = "seeker" } = userData;

  if (!email && !phone) {
    throw new Error("Email or phone number is required.");
  }

  // 1. Check if email already exists (Primary Login Identifier)
  const existingEmail = await findUserByEmail(email);
  if (existingEmail) {
    throw new Error("Email already registered.");
  }

  // 2. Check if phone already exists
  if (phone) {
    const existingPhone = await findUserByPhone(phone);
    if (existingPhone) {
      throw new Error("Phone number already registered.");
    }
  }

  // 3. Format roles (supports single role string or array for dual Seeker/Host accounts)
  const rolesArray = Array.isArray(role) ? role : [role];

  // 4. Hash password
  const password_hash = await hashPassword(password);

  // 5. Create user record
  const user = await createUser({
    full_name,
    email,
    phone,
    password_hash,
    role: rolesArray[0],
    roles: rolesArray,
  });

  // 6. If user selected host role, initialize host profile
  if (rolesArray.includes("host")) {
    await createHostProfile(user.id);
  }

  return {
    message: "User registered successfully.",
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
    },
  };
};

/**
 * Login user
 * PRD Section 11.1: Authenticate via Email and Password
 */
export const login = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
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
      roles: user.roles,
      is_verified: user.is_verified,
    },
  };
};

/**
 * Refresh Access Token
 * PRD Section 11.1 & 16.1
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
