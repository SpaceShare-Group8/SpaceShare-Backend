import { body } from "express-validator";

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
    .withMessage("Full name must be between 2 and 100 characters."),

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
    .withMessage("Password must be at least 8 characters long.")
    .matches(/\d/)
    .withMessage("Password must contain at least one number.")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter."),

  body("role")
    .optional()
    .isIn(["seeker", "host", "admin"])
    .withMessage("Invalid role specified. Must be 'seeker', 'host', or 'admin'."),

  body("roles")
    .optional()
    .isArray()
    .withMessage("Roles must be an array of valid role strings.")
    .custom((roles) => {
      const validRoles = ["seeker", "host", "admin"];
      const isValid = roles.every((r) => validRoles.includes(r));
      if (!isValid) {
        throw new Error("Roles contains invalid entries. Allowed: seeker, host, admin.");
      }
      return true;
    }),

  // Custom validator to ensure either email OR phone is provided
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error("Either email or phone number must be provided.");
    }
    return true;
  }),
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
    .trim(),

  body("password")
    .notEmpty()
    .withMessage("Password is required."),

  // Custom validator to ensure either email OR phone is supplied
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error("Either email or phone number is required to log in.");
    }
    return true;
  }),
];

/**
 * Validation rules for token refresh
 * POST /api/auth/refresh
 */
export const refreshValidation = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required."),
];
