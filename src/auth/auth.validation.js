import { body, validationResult} from "express-validator";

//Handles validation errors
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
    .isIn(["seeker", "host", "corporate_admin", "admin"])
    .withMessage("Invalid role specified. Must be 'seeker', 'host','corporate_admin', or 'admin'."),

  // body("roles")
  //   .optional()
  //   .isArray({ min:1 })
  //   .withMessage("Roles must be an array of valid role strings.")
  //   .custom((roles) => {
  //     const validRoles = ["seeker", "host", "corporate_admin", "admin"];
  //     const isValid = roles.every((r) => validRoles.includes(r));
  //     if (!isValid) {
  //       throw new Error("Roles contains invalid entries. Allowed: seeker, host, corporate_admin, admin.");
  //     }
  //     return true;
  //   }),


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
    .withMessage("Please provide a valid phone number."),

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
  validate,
];

/**
 * Validation rules for token refresh
 * POST /api/auth/refresh
 */
export const refreshValidation = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required."),
    validate,
];

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
    .normalizeEmail(),

    validate,
];

/**
 * Validation rules for Reset Password
 * POST /api/auth/reset-password
 */
export const resetPasswordValidation = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required."),

  body("password")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/\d/)
    .withMessage("Password must contain at least one number.")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter."),

    validate,
];

