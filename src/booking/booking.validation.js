/**
 * SpaceShare - Booking Request Validation Rules
 * Validates ISO 8601 date-times, UUID parameters, 6-digit check-in codes,
 * and corporate booking parameters using express-validator.
 * 
 * Aligns strictly with SpaceShare Master PRD (Section 10.5, 10.7, 11.7, 11.11, & 16.4)
 */

import { body, param, validationResult } from 'express-validator';

/**
 * Middleware to handle express-validator result and return standard format errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Validation rules for UUID route parameters (e.g., /api/bookings/:id)
 */
export const validateBookingIdParam = [
  param('id')
    .notEmpty()
    .withMessage('Booking ID parameter is required')
    .isUUID(4)
    .withMessage('Booking ID must be a valid UUIDv4'),
  validate,
];

/**
 * Validation rules for Creating a Booking (PRD 10.5, 11.7)
 * POST /api/bookings
 */
export const validateCreateBooking = [
  body('workspaceId')
    .notEmpty()
    .withMessage('Workspace ID is required')
    .isUUID(4)
    .withMessage('Workspace ID must be a valid UUIDv4'),

  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date-time string (e.g. 2026-08-01T09:00:00Z)')
    .custom((value) => {
      const startTime = new Date(value);
      if (startTime < new Date()) {
        throw new Error('Start time cannot be in the past');
      }
      return true;
    }),

  body('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date-time string')
    .custom((value, { req }) => {
      const startTime = new Date(req.body.startTime);
      const endTime = new Date(value);
      
      if (endTime <= startTime) {
        throw new Error('End time must be after the start time');
      }
      return true;
    }),

  body('totalAmount')
    .notEmpty()
    .withMessage('Total amount is required')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),

  body('corporateAccountId')
    .optional({ nullable: true })
    .isUUID(4)
    .withMessage('Corporate Account ID must be a valid UUIDv4 if provided'),

  validate,
];

/**
 * Validation rules for Check-In Code verification (PRD 10.7, 11.11)
 * POST /api/bookings/:id/checkin
 */
export const validateCheckIn = [
  param('id')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isUUID(4)
    .withMessage('Booking ID must be a valid UUIDv4'),

  body('checkinCode')
    .notEmpty()
    .withMessage('Check-in code is required')
    .isString()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Check-in code must be exactly 6 numeric digits (e.g., 123456)'),

  validate,
];