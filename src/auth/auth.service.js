import * as authRepository from "./auth.repository.js";
import { hashPassword, comparePassword } from "../common/utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from "../common/utils/jwt.js";
import { sendEmail } from "../common/utils/mailer.js";

/**
 * Register a new user.
 */
export const register = async (userData) => {
  const {
    full_name,
    email,
    phone,
    password,
    role = "seeker",
  } = userData;

  if (!email && !phone) {
    throw new Error("Email or phone number is required.");
  }

  const allowedRoles = [
    "seeker",
    "host",
    "corporate_admin",
    "admin",
  ];

  if (!allowedRoles.includes(role)) {
    throw new Error("Invalid user role.");
  }

  if (email) {
    const existingEmail = await authRepository.findUserByEmail(email);

    if (existingEmail) {
      throw new Error("Email already registered.");
    }
  }

  if (phone) {
    const existingPhone = await authRepository.findUserByPhone(phone);

    if (existingPhone) {
      throw new Error("Phone number already registered.");
    }
  }

  const password_hash = await hashPassword(password);

  const user = await authRepository.createUser({
    full_name,
    email,
    phone,
    password_hash,
    role,
  });

  // Automatically create host profile
  if (user.role === "host") {
    const hostProfile =
      await authRepository.findHostProfileByUserId(user.id);

    if (!hostProfile) {
      await authRepository.createHostProfile(user.id);
    }
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    message: "User registered successfully.",
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
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
 * Login user.
 */
export const login = async ({
  email,
  phone,
  password,
}) => {
  if (!email && !phone) {
    throw new Error("Email or phone number is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  const user = await authRepository.findUserByEmailOrPhone({
    email,
    phone,
  });

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isPasswordValid = await comparePassword(
    password,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
  }

  // Automatically create host profile
  if (user.role === "host") {
    const hostProfile =
      await authRepository.findHostProfileByUserId(user.id);

    if (!hostProfile) {
      await authRepository.createHostProfile(user.id);
    }
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    message: "Login successful.",
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
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
 * Refresh access token.
 */
export const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required.");
  }

  let decoded;

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error("Invalid or expired refresh token.");
  }

  const user = await authRepository.findUserById(decoded.id);

  if (!user) {
    throw new Error("User not found.");
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Forgot Password.
 */
export const forgotPassword = async (email) => {
  if (!email) {
    throw new Error("Email is required.");
  }

  const user =
    await authRepository.findUserForPasswordReset(email);

  // Prevent email enumeration
  if (!user) {
    return {
      message:
        "If an account exists with this email, password reset instructions have been sent.",
    };
  }

  const resetToken = generatePasswordResetToken(user);
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  // Send reset email via Brevo
  await sendEmail({
    to: user.email,
    subject: "SpaceShare - Password Reset Request",
    text: `You requested a password reset. Please use the following link to reset your password: ${resetUrl}`,
    html: `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
  });

  return {
    message:
      "If an account exists with this email, password reset instructions have been sent.",
    resetToken:
      process.env.NODE_ENV === "development"
        ? resetToken
        : undefined,
  };
};

/**
 * Reset Password.
 */
export const resetPassword = async (
  token,
  newPassword
) => {
  if (!token) {
    throw new Error("Reset token is required.");
  }

  if (!newPassword) {
    throw new Error("New password is required.");
  }

  let decoded;

  try {
    decoded = verifyPasswordResetToken(token);
  } catch {
    throw new Error("Invalid or expired reset token.");
  }

  const user = await authRepository.findUserById(decoded.id);

  if (!user) {
    throw new Error("User not found.");
  }

  const password_hash = await hashPassword(newPassword);

  await authRepository.updatePassword(
    user.id,
    password_hash
  );

  return {
    message: "Password reset successfully.",
  };
};