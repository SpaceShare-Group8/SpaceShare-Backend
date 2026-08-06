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
 * Generate a 6-digit OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Register a new user with OTP verification
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
    const hostProfile = await authRepository.findHostProfileByUserId(user.id);
    if (!hostProfile) {
      await authRepository.createHostProfile(user.id);
    }
  }

  // Generate and store OTP for email verification
  if (user.email) {
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      // Store OTP in database
      await authRepository.updateUserOTP(user.id, otp, otpExpiry);

      // Send OTP email
      await sendEmail({
        to: user.email,
        subject: "🔐 SpaceShare - Your Verification Code",
        text: `Your SpaceShare verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2862BC; margin: 0;">SpaceShare</h1>
              <p style="color: #64748B; margin: 5px 0 0;">Verify Your Account</p>
            </div>
            
            <div style="background: #F8FAFC; border-radius: 12px; padding: 30px; text-align: center;">
              <h2 style="color: #0F172A; margin-bottom: 10px; font-size: 20px;">🔐 Verification Code</h2>
              <p style="color: #64748B; margin-bottom: 20px; font-size: 15px;">Use the code below to verify your account:</p>
              
              <div style="background: white; border: 2px dashed #2862BC; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #2862BC;">${otp}</span>
              </div>
              
              <p style="color: #64748B; font-size: 14px; margin: 10px 0;">
                This code expires in <strong>10 minutes</strong>.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
              <p style="color: #94A3B8; font-size: 12px; margin: 0;">
                If you didn't create an account with SpaceShare, please ignore this email.
              </p>
              <p style="color: #94A3B8; font-size: 12px; margin: 5px 0 0;">
                © ${new Date().getFullYear()} SpaceShare. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error("[OTP Error] Failed to store or send OTP:", error);
      // Don't throw - user is created, just log the error
    }
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    message: "User registered successfully. Please verify your email with the OTP sent.",
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
 * Verify OTP and activate user account
 */
export const verifyOTP = async (email, otp) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required.");
  }

  const user = await authRepository.findUserWithOTP(email);

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.is_verified) {
    throw new Error("User is already verified.");
  }

  if (!user.otp) {
    throw new Error("No OTP found. Please request a new one.");
  }

  // Check if OTP has expired
  const now = new Date();
  const expiry = new Date(user.otp_expiry);
  if (now > expiry) {
    throw new Error("OTP has expired. Please request a new one.");
  }

  // Verify OTP
  if (user.otp !== otp) {
    throw new Error("Invalid OTP code. Please try again.");
  }

  // Mark user as verified
  const verifiedUser = await authRepository.verifyUserWithOTP(user.id);

  return {
    message: "OTP verified successfully.",
    user: {
      id: verifiedUser.id,
      email: verifiedUser.email,
      is_verified: verifiedUser.is_verified,
    },
  };
};

/**
 * Resend OTP to user
 */
export const resendOTP = async (email) => {
  if (!email) {
    throw new Error("Email is required.");
  }

  console.log("[Resend OTP] Looking for user with email:", email);

  const user = await authRepository.findUserWithOTP(email);

  if (!user) {
    console.log("[Resend OTP] User not found:", email);
    throw new Error("User not found.");
  }

  console.log("[Resend OTP] User found:", user.id, "Verified:", user.is_verified);

  if (user.is_verified) {
    throw new Error("User is already verified.");
  }

  // Generate new OTP
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  console.log("[Resend OTP] New OTP generated:", otp, "Expires:", otpExpiry);

  try {
    // Save new OTP
    await authRepository.updateUserOTP(user.id, otp, otpExpiry);
    console.log("[Resend OTP] OTP saved to database");

    // Send OTP via email
    await sendEmail({
      to: user.email,
      subject: "🔐 SpaceShare - New Verification Code",
      text: `Your new SpaceShare verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2862BC; margin: 0;">SpaceShare</h1>
            <p style="color: #64748B; margin: 5px 0 0;">New Verification Code</p>
          </div>
          
          <div style="background: #F8FAFC; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #0F172A; margin-bottom: 10px; font-size: 20px;">🔐 New Verification Code</h2>
            <p style="color: #64748B; margin-bottom: 20px; font-size: 15px;">Your new verification code is:</p>
            
            <div style="background: white; border: 2px dashed #2862BC; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #2862BC;">${otp}</span>
            </div>
            
            <p style="color: #64748B; font-size: 14px; margin: 10px 0;">
              This code expires in <strong>10 minutes</strong>.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
            <p style="color: #94A3B8; font-size: 12px; margin: 0;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      `,
    });
    console.log("[Resend OTP] Email sent successfully to:", user.email);
  } catch (error) {
    console.error("[Resend OTP] Error:", error);
    throw new Error("Failed to resend OTP. Please try again.");
  }

  return {
    message: "New OTP sent successfully.",
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

  // Check if user is verified
  if (!user.is_verified) {
    throw new Error("Please verify your email first. Check your inbox for the OTP.");
  }

  // Automatically create host profile
  if (user.role === "host") {
    const hostProfile = await authRepository.findHostProfileByUserId(user.id);
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

  const user = await authRepository.findUserForPasswordReset(email);

  // Prevent email enumeration attack
  if (!user) {
    return {
      message: "If an account exists with this email, password reset instructions have been sent.",
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
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2862BC; margin: 0;">SpaceShare</h1>
          <p style="color: #64748B; margin: 5px 0 0;">Password Reset</p>
        </div>
        
        <div style="background: #F8FAFC; border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #0F172A; margin-bottom: 10px; font-size: 20px;">Reset Your Password</h2>
          <p style="color: #64748B; margin-bottom: 20px; font-size: 15px;">
            You requested a password reset for your SpaceShare account.
          </p>
          
          <a href="${resetUrl}" style="display: inline-block; background-color: #2862BC; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 10px 0;">
            Reset Password
          </a>
          
          <p style="color: #64748B; font-size: 14px; margin: 15px 0 0;">
            This link expires in <strong>15 minutes</strong>.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
          <p style="color: #94A3B8; font-size: 12px; margin: 0;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `,
  });

  return {
    message: "If an account exists with this email, password reset instructions have been sent.",
    resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined,
  };
};

/**
 * Reset Password.
 */
export const resetPassword = async (token, newPassword) => {
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

  await authRepository.updatePassword(user.id, password_hash);

  return {
    message: "Password reset successfully.",
  };
};