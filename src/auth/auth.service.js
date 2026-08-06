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

  // Automatically create host profile if registering as host
  if (user.role === "host") {
    const hostProfile =
      await authRepository.findHostProfileByUserId(user.id);

    if (!hostProfile) {
      await authRepository.createHostProfile(user.id);
    }
  }

  // Dispatch Welcome Email asynchronously if user registered with an email
  if (user.email) {
    sendEmail({
      to: user.email,
      subject: "Welcome to SpaceShare!",
      text: `Hello ${user.full_name || 'User'},\n\nWelcome to SpaceShare! We're excited to have you on board.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to SpaceShare, ${user.full_name || 'User'}!</h2>
          <p>Thank you for creating an account with us. We are thrilled to have you join our community.</p>
          <p>If you have any questions or need support, feel free to reach out to our team.</p>
          <br />
          <p>Best regards,<br />The SpaceShare Team</p>
        </div>
      `,
    }).catch((err) => {
      // Catch and log mailer errors so registration flow isn't interrupted
      console.error("[Email Error] Failed to send welcome email:", err);
    });
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

  // Prevent email enumeration attack
  if (!user) {
    return {
      message:
        "If an account exists with this email, password reset instructions have been sent.",
    };
  }

  const resetToken = generatePasswordResetToken(user);
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

  // Send reset email via mailer module
  await sendEmail({
    to: user.email,
    subject: "SpaceShare - Password Reset Request",
    text: `You requested a password reset. Please use the following link to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your SpaceShare account.</p>
        <p>Click the button below to set a new password:</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
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