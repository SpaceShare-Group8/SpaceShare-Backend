import express from "express";

import {
  register,
  login,
  refresh,
  forgotPassword,
  resetPassword,
  verifyOTP,
  resendOTP,
  getMe,
} from "./auth.controller.js";

import {
  registerValidation,
  loginValidation,
  refreshValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyOTPValidation,
  resendOTPValidation,
  validate,
} from "./auth.validation.js";

import { protect } from "../common/middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new Seeker or Host
 * @access  Public
 */
router.post(
  "/register",
  registerValidation,
  validate,
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login with email or phone
 * @access  Public
 */
router.post(
  "/login",
  loginValidation,
  validate,
  login
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code sent to email
 * @access  Public
 */
router.post(
  "/verify-otp",
  verifyOTPValidation,
  validate,
  verifyOTP
);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP code to email
 * @access  Public
 */
router.post(
  "/resend-otp",
  resendOTPValidation,
  validate,
  resendOTP
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Generate a new Access Token using a valid Refresh Token
 * @access  Public
 */
router.post(
  "/refresh",
  refreshValidation,
  validate,
  refresh
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Generate password reset token
 * @access  Public
 */
router.post(
  "/forgot-password",
  forgotPasswordValidation,
  validate,
  forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset account password
 * @access  Public
 */
router.post(
  "/reset-password",
  resetPasswordValidation,
  validate,
  resetPassword
);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user
 * @access  Private
 */
router.get("/me", protect, getMe);

export default router;