import express from "express";

import {
  register,
  login,
  refresh,
} from "./auth.controller.js";

import {
  registerValidation,
  loginValidation,
  refreshValidation,
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
  login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Generate a new Access Token using a valid Refresh Token
 * @access  Public
 */
router.post(
  "/refresh",
  refreshValidation,
  refresh
);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user
 * @access  Private
 */
router.get("/me", protect, (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
});

export default router;