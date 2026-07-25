import { body, validationResult } from "express-validator";

/**
 * Handle validation errors
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Register Validation
 */
export const registerValidation = [
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error("Either email or phone number is required.");
    }
    return true;
  }),
  
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ min: 3, max: 150 })
    .withMessage("Full name must be between 3 and 150 characters."),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address."),

  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),

  body("role")
    .optional()
    .isIn(["seeker", "host", "corporate_admin", "admin"])
    .withMessage("Role must be either seeker, host, corporate_admin, or admin."),

  validate,
];

/**
 * Login Validation
 */
export const loginValidation = [
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error("Either email or phone number is required.");
    }
    return true;
  }),
  
  body("email")
  .optional()
  .isEmail()
  .withMessage("Please provide a valid email address."),

  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number."),

  body("password")
    .notEmpty()
    .withMessage("Password is required."),

  validate,
];

/**
 * Refresh Token Validation
 */
export const refreshValidation = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required."),

  validate,
];
