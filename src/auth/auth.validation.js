import { body, validationResult } from "express-validator";

/**
 * Handle validation errors middleware
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
 * Register Validation Rules
 * PRD Section 11.1: Email is login identifier; Phone is a required profile field at signup.
 */
export const registerValidation = [
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ min: 3, max: 150 })
    .withMessage("Full name must be between 3 and 150 characters."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address."),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required as a profile field.")
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),

  body("role")
    .optional()
    .custom((role) => {
      const validRoles = ["seeker", "host", "corporate_admin"];
      if (Array.isArray(role)) {
        return role.every((r) => validRoles.includes(r));
      }
      return validRoles.includes(role);
    })
    .withMessage("Role must be seeker, host, corporate_admin, or a combination."),

  validate,
];

/**
 * Login Validation Rules
 * PRD Section 11.1: Email (login identifier) + Password only.
 */
export const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address."),

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
