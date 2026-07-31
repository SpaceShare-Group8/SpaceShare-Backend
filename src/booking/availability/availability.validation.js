import { body } from "express-validator";

export const validateCreateAvailability = [
  body("workspace_id")
    .notEmpty()
    .withMessage("workspace_id is required"),

  body("date")
    .isISO8601()
    .withMessage("Valid date is required"),

  body("start_time")
    .notEmpty()
    .withMessage("start_time is required"),

  body("end_time")
    .notEmpty()
    .withMessage("end_time is required"),

  body("is_blocked")
    .optional()
    .isBoolean()
    .withMessage("is_blocked must be true or false"),
];

export const validateUpdateAvailability = [
  body("date").optional().isISO8601(),

  body("start_time").optional(),

  body("end_time").optional(),

  body("is_blocked").optional().isBoolean(),
];