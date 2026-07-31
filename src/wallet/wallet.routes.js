// ================================================================
// WALLET VALIDATION
// Request validation schemas for the SpaceShare Wallet System
// PRD Sections: 10.8, 11.8, 11.15
// ================================================================

import { body, query, param, validationResult } from 'express-validator';
import { getBankCodes, WITHDRAWAL_LIMITS } from './wallet.constants.js';

// ================================================================
// VALIDATION MIDDLEWARE
// ================================================================

/**
 * Handle validation errors and return standardized response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Object} - Validation error response or next()
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }

  next();
};

// ================================================================
// WITHDRAWAL VALIDATION
// PRD Section 11.8 - Host withdrawal requests
// ================================================================

/**
 * Validation schema for POST /api/wallet/withdraw
 * Validates: amount, bankCode, accountNumber, accountName
 */
export const validateWithdrawalRequest = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage(`Amount must be a positive number (minimum: ₦${WITHDRAWAL_LIMITS.MIN_AMOUNT})`)
    .custom((value) => {
      const numAmount = parseFloat(value);
      if (numAmount < WITHDRAWAL_LIMITS.MIN_AMOUNT) {
        throw new Error(`Minimum withdrawal amount is ₦${WITHDRAWAL_LIMITS.MIN_AMOUNT}`);
      }
      if (numAmount > WITHDRAWAL_LIMITS.MAX_AMOUNT) {
        throw new Error(`Maximum withdrawal amount is ₦${WITHDRAWAL_LIMITS.MAX_AMOUNT}`);
      }
      return true;
    })
    .toFloat(),

  body('bankCode')
    .notEmpty()
    .withMessage('Bank code is required')
    .isString()
    .withMessage('Bank code must be a string')
    .isLength({ min: 3, max: 5 })
    .withMessage('Bank code must be 3-5 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Bank code must contain only uppercase letters and numbers')
    .custom((value) => {
      const bankCodes = getBankCodes();
      if (!bankCodes.includes(value)) {
        throw new Error(`Invalid bank code. Please select a valid Nigerian bank`);
      }
      return true;
    })
    .trim()
    .toUpperCase(),

  body('accountNumber')
    .notEmpty()
    .withMessage('Account number is required')
    .isString()
    .withMessage('Account number must be a string')
    .isLength({ min: 10, max: 10 })
    .withMessage('Account number must be exactly 10 digits')
    .matches(/^[0-9]+$/)
    .withMessage('Account number must contain only numbers')
    .trim(),

  body('accountName')
    .notEmpty()
    .withMessage('Account holder name is required')
    .isString()
    .withMessage('Account holder name must be a string')
    .isLength({ min: 2, max: 100 })
    .withMessage('Account holder name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage('Account holder name contains invalid characters. Use letters, spaces, dots, apostrophes, or hyphens only')
    .trim()
    .customSanitizer((value) => {
      // Remove extra spaces and normalize
      return value.replace(/\s+/g, ' ').trim();
    })
];

// ================================================================
// TRANSACTION FILTERS VALIDATION
// PRD Section 11.8 - Transaction history
// ================================================================

/**
 * Validation schema for GET /api/wallet/transactions
 * Validates: page, limit, type, status, startDate, endDate
 */
export const validateTransactionFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),

  query('type')
    .optional()
    .isString()
    .withMessage('Type must be a string')
    .isIn(['payment', 'refund', 'payout', 'bonus', 'adjustment', 'commission', 'fee'])
    .withMessage('Invalid transaction type. Allowed: payment, refund, payout, bonus, adjustment, commission, fee')
    .trim(),

  query('status')
    .optional()
    .isString()
    .withMessage('Status must be a string')
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid transaction status. Allowed: pending, processing, completed, failed, cancelled')
    .trim(),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)')
    .customSanitizer((value) => {
      // Ensure consistent date format
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid start date');
      }
      return date.toISOString();
    }),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)')
    .custom((value, { req }) => {
      if (req.query.startDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(value);
        if (end < start) {
          throw new Error('End date must be after start date');
        }
        // Prevent date range > 1 year
        const diffInDays = (end - start) / (1000 * 60 * 60 * 24);
        if (diffInDays > 365) {
          throw new Error('Date range cannot exceed 365 days');
        }
      }
      return true;
    })
    .customSanitizer((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid end date');
      }
      return date.toISOString();
    })
];

// ================================================================
// WITHDRAWAL HISTORY FILTERS VALIDATION
// PRD Section 11.8 - Withdrawal history
// ================================================================

/**
 * Validation schema for GET /api/wallet/withdrawals
 * Validates: page, limit, status, startDate, endDate
 */
export const validateWithdrawalFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),

  query('status')
    .optional()
    .isString()
    .withMessage('Status must be a string')
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'review_required'])
    .withMessage('Invalid withdrawal status. Allowed: pending, processing, completed, failed, cancelled, review_required')
    .trim(),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .customSanitizer((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid start date');
      }
      return date.toISOString();
    }),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.startDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(value);
        if (end < start) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    })
    .customSanitizer((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid end date');
      }
      return date.toISOString();
    })
];

// ================================================================
// EARNINGS PERIOD VALIDATION
// PRD Section 11.8 - Track earnings
// ================================================================

/**
 * Validation schema for GET /api/wallet/earnings
 * Validates: period (daily, weekly, monthly, yearly)
 */
export const validateEarningsPeriod = [
  query('period')
    .optional()
    .isString()
    .withMessage('Period must be a string')
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Invalid period. Must be one of: daily, weekly, monthly, yearly')
    .trim()
    .toLowerCase()
];

// ================================================================
// PAYOUT SCHEDULE VALIDATION
// PRD Section 10.8 - 24-hour hold period
// ================================================================

/**
 * Validation schema for GET /api/wallet/payouts/schedule
 * Validates: status, limit, page
 */
export const validatePayoutSchedule = [
  query('status')
    .optional()
    .isString()
    .withMessage('Status must be a string')
    .isIn(['pending', 'ready', 'processing', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid payout status. Allowed: pending, ready, processing, completed, failed, cancelled')
    .trim(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt()
];

// ================================================================
// PAYOUT PROCESSING VALIDATION (ADMIN ONLY)
// PRD Section 11.15 - Admin payment handling
// ================================================================

/**
 * Validation schema for POST /api/wallet/payouts/process
 * Validates: payoutIds, batchSize
 */
export const validatePayoutProcessing = [
  body('payoutIds')
    .optional()
    .isArray()
    .withMessage('payoutIds must be an array')
    .custom((value) => {
      if (value && value.length > 0) {
        const isValid = value.every((id) => {
          // Check if it's a valid UUID v4
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return typeof id === 'string' && uuidRegex.test(id);
        });
        if (!isValid) {
          throw new Error('All payout IDs must be valid UUIDs');
        }
      }
      return true;
    })
    .custom((value) => {
      if (value && value.length > 100) {
        throw new Error('Maximum 100 payout IDs can be processed at once');
      }
      return true;
    }),

  body('batchSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Batch size must be between 1 and 100')
    .toInt()
];

// ================================================================
// ADMIN ADJUSTMENT VALIDATION
// PRD Section 11.15 - Admin manual adjustment
// ================================================================

/**
 * Validation schema for POST /api/wallet/admin/adjustment
 * Validates: hostId, amount, reason
 */
export const validateAdminAdjustment = [
  body('hostId')
    .notEmpty()
    .withMessage('Host ID is required')
    .isUUID(4)
    .withMessage('Host ID must be a valid UUID'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .custom((value) => {
      const numAmount = parseFloat(value);
      if (numAmount > 10000000) {
        throw new Error('Amount cannot exceed ₦10,000,000 per adjustment');
      }
      return true;
    })
    .toFloat(),

  body('reason')
    .notEmpty()
    .withMessage('Reason is required for manual adjustment')
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters')
    .trim()
    .customSanitizer((value) => {
      // Sanitize to prevent injection
      return value.replace(/[<>]/g, '');
    })
];

// ================================================================
// WITHDRAWAL STATUS UPDATE VALIDATION (ADMIN ONLY)
// PRD Section 11.15 - Admin payment handling
// ================================================================

/**
 * Validation schema for PATCH /api/wallet/withdrawals/:withdrawalId/status
 * Validates: withdrawalId, status, reason
 */
export const validateWithdrawalStatusUpdate = [
  param('withdrawalId')
    .notEmpty()
    .withMessage('Withdrawal ID is required')
    .isUUID(4)
    .withMessage('Withdrawal ID must be a valid UUID'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isString()
    .withMessage('Status must be a string')
    .isIn(['processing', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status. Allowed: processing, completed, failed, cancelled')
    .trim(),

  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters')
    .trim()
    .customSanitizer((value) => {
      if (value) {
        return value.replace(/[<>]/g, '');
      }
      return value;
    })
    .custom((value, { req }) => {
      // Reason is required if status is 'failed' or 'cancelled'
      if ((req.body.status === 'failed' || req.body.status === 'cancelled') && !value) {
        throw new Error('Reason is required when marking a withdrawal as failed or cancelled');
      }
      return true;
    })
];

// ================================================================
// WALLET BALANCE VALIDATION
// PRD Section 11.8 - Wallet balance
// ================================================================

/**
 * Validation schema for GET /api/wallet/balance
 * No parameters required, just authentication
 */
export const validateWalletBalance = [
  // No validation needed, just ensure user is authenticated
  (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    next();
  }
];

// ================================================================
// EXPORTS
// ================================================================

export default {
  validate,
  validateWithdrawalRequest,
  validateTransactionFilters,
  validateWithdrawalFilters,
  validateEarningsPeriod,
  validatePayoutSchedule,
  validatePayoutProcessing,
  validateAdminAdjustment,
  validateWithdrawalStatusUpdate,
  validateWalletBalance
};