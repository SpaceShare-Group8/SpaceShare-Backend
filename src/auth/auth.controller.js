import * as authService from "./auth.service.js";

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      message: result.message,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      data: result.user,
    });
  } catch (error) {
    if (
      error.message === "Email already registered." ||
      error.message === "Phone number already registered."
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message === "Email or phone number is required." ||
      error.message === "Invalid user role."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      data: result.user,
    });
  } catch (error) {
    if (
      error.message === "Invalid email or password." ||
      error.message === "Please verify your email first. Check your inbox for the OTP."
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message === "Email or phone number is required." ||
      error.message === "Password is required."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const result = await authService.verifyOTP(email, otp);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error) {
    if (
      error.message === "User not found." ||
      error.message === "No OTP found. Please request a new one."
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message === "User is already verified." ||
      error.message === "OTP has expired. Please request a new one." ||
      error.message === "Invalid OTP code. Please try again."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("OTP verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP. Please try again.",
    });
  }
};

/**
 * Resend OTP
 * POST /api/auth/resend-otp
 */
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const result = await authService.resendOTP(email);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error.message === "User not found.") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "User is already verified.") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Resend OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP. Please try again.",
    });
  }
};

/**
 * Refresh Access Token
 * POST /api/auth/refresh
 */
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const result = await authService.refresh(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    if (error.message === "Refresh token is required.") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message === "Invalid or expired refresh token." ||
      error.message === "User not found."
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Refresh error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

/**
 * Forgot Password
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    return res.status(200).json({
      success: true,
      message: result.message,
      ...(result.resetToken && {
        resetToken: result.resetToken,
      }),
    });
  } catch (error) {
    if (error.message === "Email is required.") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Forgot Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

/**
 * Reset Password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (
      error.message === "Reset token is required." ||
      error.message === "New password is required."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message === "Invalid or expired reset token." ||
      error.message === "User not found."
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get me error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get user profile.",
    });
  }
};