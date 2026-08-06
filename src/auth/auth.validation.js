import { body, validationResult } from "express-validator";

// ================================================================
// VALIDATION ERROR HANDLER
// ================================================================

/**
 * Handle validation errors
 * Returns formatted error response
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
};

// ================================================================
// AUTHENTICATION VALIDATIONS
// ================================================================

/**
 * Validation rules for user registration
 * POST /api/auth/register
 * PRD Section 11.1 & 16.1
 */
export const registerValidation = [
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters.")
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage("Full name contains invalid characters. Use letters, spaces, dots, apostrophes, or hyphens only."),

  body("email")
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters."),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid phone number in E.164 format (e.g., +2348012345678).")
    .isLength({ min: 7, max: 15 })
    .withMessage("Phone number must be between 7 and 15 characters."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/\d/)
    .withMessage("Password must contain at least one number.")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter."),

  body("role")
    .optional()
    .isIn(["seeker", "host", "corporate_admin", "admin"])
    .withMessage("Invalid role specified. Must be 'seeker', 'host', 'corporate_admin', or 'admin'."),

  // Custom validator to ensure either email OR phone is provided
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error("Either email or phone number must be provided.");
    }
    return true;
  }),

  validate,
];

/**
 * Validation rules for user login
 * POST /api/auth/login
 * PRD Section 11.1
 */
export const loginValidation = [
  body("email")
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid phone number in E.164 format."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),

  // Custom validator to ensure either email OR phone is supplied
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error("Either email or phone number is required to log in.");
    }
    return true;
  }),

  validate,
];

// ================================================================
// OTP VALIDATIONS (NEW)
// ================================================================

/**
 * Validation rules for OTP verification
 * POST /api/auth/verify-otp
 */
export const verifyOTPValidation = [
  body("email")
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters."),

  body("otp")
    .notEmpty()
    .withMessage("OTP code is required.")
    .isString()
    .withMessage("OTP must be a string.")
    .matches(/^\d{6}$/)
    .withMessage("OTP must be exactly 6 digits (e.g., 123456).")
    .trim(),

  validate,
];

/**
 * Validation rules for resending OTP
 * POST /api/auth/resend-otp
 */
export const resendOTPValidation = [
  body("email")
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters."),

  validate,
];

// ================================================================
// TOKEN VALIDATIONS
// ================================================================

/**
 * Validation rules for token refresh
 * POST /api/auth/refresh
 */
export const refreshValidation = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required.")
    .isString()
    .withMessage("Refresh token must be a string.")
    .trim(),

  validate,
];

// ================================================================
// PASSWORD RESET VALIDATIONS
// ================================================================

/**
 * Validation rules for Forgot Password
 * POST /api/auth/forgot-password
 */
export const forgotPasswordValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters."),

  validate,
];

/**
 * Validation rules for Reset Password
 * POST /api/auth/reset-password
 */
export const resetPasswordValidation = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required.")
    .isString()
    .withMessage("Reset token must be a string.")
    .trim(),

  body("password")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/\d/)
    .withMessage("Password must contain at least one number.")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter."),

  validate,
];

// ================================================================
// EXPORTS
// ================================================================

export default {
  validate,
  registerValidation,
  loginValidation,
  verifyOTPValidation,
  resendOTPValidation,
  refreshValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};