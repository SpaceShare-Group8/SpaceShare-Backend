// ================================================================
// WALLET CONTROLLER
// HTTP request handlers for wallet endpoints
// PRD Sections: 10.8, 11.8, 11.15
// ================================================================

import {
  getWalletBalance,
  getTransactionHistory,
  requestWithdrawal,
  getWithdrawalHistory,
  getEarningsSummary,
  getPendingPayouts,
  processPendingPayouts,
  getPayoutSchedule,
  getWalletStats
} from './wallet.service.js';

import { WALLET_ERROR_MESSAGES } from './wallet.constants.js';

// ================================================================
// GET WALLET BALANCE
// GET /api/wallet/balance
// PRD Section 11.8 - Host wallet
// ================================================================

/**
 * Get the wallet balance for the authenticated host
 * 
 * @route GET /api/wallet/balance
 * @access Private (Host only)
 * @returns {Object} - Wallet balance, pending withdrawals, total earned
 * 
 * @example
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "balance": 25000.00,
 *     "currency": "NGN",
 *     "pending_withdrawals": 5000.00,
 *     "total_earned": 30000.00,
 *     "last_updated": "2026-07-31T10:30:00.000Z"
 *   }
 * }
 */
export const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user has host role
    if (!req.user.roles?.includes('host') && req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Only hosts can access wallet balance'
      });
    }

    const walletData = await getWalletBalance(userId);

    return res.status(200).json({
      success: true,
      data: walletData
    });

  } catch (error) {
    console.error('❌ Get wallet balance error:', error.message);
    
    if (error.message === WALLET_ERROR_MESSAGES.WALLET_NOT_FOUND) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallet balance'
    });
  }
};

// ================================================================
// GET TRANSACTION HISTORY
// GET /api/wallet/transactions
// PRD Section 11.8 - Transaction history
// ================================================================

/**
 * Get paginated transaction history for the authenticated user
 * 
 * @route GET /api/wallet/transactions
 * @access Private (Host only)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10, max: 50)
 * @query {string} type - Filter by transaction type (payment, refund, payout, etc.)
 * @query {string} status - Filter by transaction status (pending, completed, failed)
 * @query {string} startDate - Filter by start date (ISO 8601)
 * @query {string} endDate - Filter by end date (ISO 8601)
 * 
 * @returns {Object} - Paginated transaction history
 * 
 * @example
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "transactions": [
 *       {
 *         "id": "uuid",
 *         "booking_id": "uuid",
 *         "amount": 15000.00,
 *         "commission_amount": 1500.00,
 *         "type": "payment",
 *         "status": "completed",
 *         "reference": "SPC-20260731-ABCD",
 *         "payment_method": "card",
 *         "created_at": "2026-07-31T10:30:00.000Z"
 *       }
 *     ],
 *     "meta": {
 *       "total": 25,
 *       "page": 1,
 *       "limit": 10,
 *       "total_pages": 3
 *     }
 *   }
 * }
 */
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user has host role
    if (!req.user.roles?.includes('host') && req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Only hosts can view transaction history'
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      type, 
      status, 
      startDate, 
      endDate 
    } = req.query;

    // Validate and parse pagination
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    
    if (isNaN(parsedPage) || parsedPage < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer'
      });
    }
    
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 50'
      });
    }

    const result = await getTransactionHistory(userId, {
      page: parsedPage,
      limit: parsedLimit,
      type,
      status,
      startDate,
      endDate
    });

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Get transaction history error:', error.message);
    
    if (error.message.includes('Invalid date format')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction history'
    });
  }
};

// ================================================================
// REQUEST WITHDRAWAL
// POST /api/wallet/withdraw
// PRD Section 11.8 - Host withdrawal requests
// ================================================================

/**
 * Request a withdrawal from wallet
 * 
 * @route POST /api/wallet/withdraw
 * @access Private (Host only)
 * @body {number} amount - Withdrawal amount
 * @body {string} bankCode - Bank code for withdrawal destination
 * @body {string} accountNumber - Bank account number
 * @body {string} accountName - Bank account holder name
 * 
 * @returns {Object} - Withdrawal request details
 * 
 * @example
 * Request:
 * {
 *   "amount": 25000,
 *   "bankCode": "001",
 *   "accountNumber": "0123456789",
 *   "accountName": "John Doe"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Withdrawal request submitted successfully",
 *   "data": {
 *     "id": "uuid",
 *     "amount": 25000,
 *     "status": "pending",
 *     "reference": "WTH-20260731-ABCD",
 *     "created_at": "2026-07-31T10:30:00.000Z"
 *   }
 * }
 */
export const withdraw = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user has host role
    if (!req.user.roles?.includes('host') && req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Only hosts can request withdrawals'
      });
    }

    const { amount, bankCode, accountNumber, accountName } = req.body;

    // Validate required fields
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    if (!bankCode) {
      return res.status(400).json({
        success: false,
        message: 'Bank code is required'
      });
    }

    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Account number is required'
      });
    }

    if (!accountName) {
      return res.status(400).json({
        success: false,
        message: 'Account name is required'
      });
    }

    // Validate amount is a positive number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    const withdrawal = await requestWithdrawal(userId, {
      amount: parsedAmount,
      bankCode,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim()
    });

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully. Please allow 1-3 business days for processing.',
      data: withdrawal
    });

  } catch (error) {
    console.error('❌ Withdrawal request error:', error.message);
    
    // Map specific error messages to appropriate HTTP status codes
    const errorMessages = {
      [WALLET_ERROR_MESSAGES.INSUFFICIENT_BALANCE]: 400,
      [WALLET_ERROR_MESSAGES.WITHDRAWAL_MINIMUM]: 400,
      [WITHDRAWAL_ERROR_MESSAGES?.WITHDRAWAL_MAXIMUM]: 400,
      [WALLET_ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED]: 429,
      [WALLET_ERROR_MESSAGES.WEEKLY_LIMIT_EXCEEDED]: 429,
      [WALLET_ERROR_MESSAGES.MONTHLY_LIMIT_EXCEEDED]: 429,
      [WALLET_ERROR_MESSAGES.MAX_DAILY_REQUESTS]: 429,
      [WALLET_ERROR_MESSAGES.MAX_WEEKLY_REQUESTS]: 429,
      [WALLET_ERROR_MESSAGES.INVALID_BANK_CODE]: 400,
      [WALLET_ERROR_MESSAGES.INVALID_ACCOUNT_NUMBER]: 400,
      [WALLET_ERROR_MESSAGES.WALLET_NOT_FOUND]: 404
    };

    const statusCode = errorMessages[error.message] || 400;
    
    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

// ================================================================
// GET WITHDRAWAL HISTORY
// GET /api/wallet/withdrawals
// PRD Section 11.8 - Withdrawal history
// ================================================================

/**
 * Get withdrawal history for the authenticated host
 * 
 * @route GET /api/wallet/withdrawals
 * @access Private (Host only)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10, max: 50)
 * @query {string} status - Filter by withdrawal status (pending, completed, failed, cancelled)
 * @query {string} startDate - Filter by start date (ISO 8601)
 * @query {string} endDate - Filter by end date (ISO 8601)
 * 
 * @returns {Object} - Paginated withdrawal history
 * 
 * @example
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "withdrawals": [
 *       {
 *         "id": "uuid",
 *         "amount": 25000,
 *         "status": "completed",
 *         "reference": "WTH-20260731-ABCD",
 *         "bank_code": "001",
 *         "account_number": "0123456789",
 *         "account_name": "John Doe",
 *         "processed_at": "2026-07-31T14:30:00.000Z",
 *         "created_at": "2026-07-31T10:30:00.000Z"
 *       }
 *     ],
 *     "meta": {
 *       "total": 15,
 *       "page": 1,
 *       "limit": 10,
 *       "total_pages": 2
 *     }
 *   }
 * }
 */
export const getWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user has host role
    if (!req.user.roles?.includes('host') && req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Only hosts can view withdrawal history'
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate 
    } = req.query;

    // Validate and parse pagination
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    
    if (isNaN(parsedPage) || parsedPage < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer'
      });
    }
    
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 50'
      });
    }

    const result = await getWithdrawalHistory(userId, {
      page: parsedPage,
      limit: parsedLimit,
      status,
      startDate,
      endDate
    });

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Get withdrawal history error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve withdrawal history'
    });
  }
};

// ================================================================
// GET EARNINGS SUMMARY
// GET /api/wallet/earnings
// PRD Section 11.8 - Track earnings
// ================================================================

/**
 * Get earnings summary for the authenticated host
 * 
 * @route GET /api/wallet/earnings
 * @access Private (Host only)
 * @query {string} period - Period for summary (daily, weekly, monthly, yearly) - default: monthly
 * 
 * @returns {Object} - Earnings summary
 * 
 * @example
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "period": "monthly",
 *     "total_earnings": 150000,
 *     "total_bookings": 12,
 *     "average_per_booking": 12500,
 *     "commission_paid": 15000,
 *     "net_earnings": 135000,
 *     "breakdown": {
 *       "current_period": 45000,
 *       "previous_period": 35000,
 *       "growth_percentage": 28.57
 *     },
 *     "top_performing": {
 *       "booking_id": "uuid",
 *       "workspace_title": "Premium Office",
 *       "amount": 30000
 *     }
 *   }
 * }
 */
export const getEarnings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user has host role
    if (!req.user.roles?.includes('host') && req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Only hosts can view earnings summary'
      });
    }

    const { period = 'monthly' } = req.query;

    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      });
    }

    const summary = await getEarningsSummary(userId, period);

    return res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Get earnings summary error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve earnings summary'
    });
  }
};

// ================================================================
// GET PENDING PAYOUTS
// GET /api/wallet/payouts/pending
// PRD Section 11.8 - Pending payouts
// ================================================================

/**
 * Get pending payouts for the authenticated host
 * 
 * @route GET /api/wallet/payouts/pending
 * @access Private (Host only)
 * 
 * @returns {Object} - Pending payouts
 * 
 * @example
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "pending_payouts": [
 *       {
 *         "id": "uuid",
 *         "booking_id": "uuid",
 *         "amount": 12000,
 *         "workspace_title": "Co-working Space",
 *         "scheduled_date": "2026-08-01T10:30:00.000Z",
 *         "status": "pending"
 *       }
 *     ],
 *     "total_pending": 1,
 *     "total_amount": 12000
 *   }
 * }
 */
export const getPendingPayoutsController = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user has host role
    if (!req.user.roles?.includes('host') && req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Only hosts can view pending payouts'
      });
    }

    const payouts = await getPendingPayouts(userId);

    return res.status(200).json({
      success: true,
      data: payouts
    });

  } catch (error) {
    console.error('❌ Get pending payouts error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending payouts'
    });
  }
};

// ================================================================
// PROCESS PENDING PAYOUTS (ADMIN ONLY)
// POST /api/wallet/payouts/process
// PRD Section 11.15 - Admin payment handling
// ================================================================

/**
 * Process pending payouts (Admin only)
 * 
 * @route POST /api/wallet/payouts/process
 * @access Private (Admin only)
 * @body {string[]} payoutIds - Specific payout IDs to process (optional)
 * @body {number} batchSize - Number of payouts to process (default: 50)
 * 
 * @returns {Object} - Processing results
 * 
 * @example
 * Request:
 * {
 *   "payoutIds": ["uuid1", "uuid2"],
 *   "batchSize": 25
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Payouts processed successfully",
 *   "data": {
 *     "processed": 2,
 *     "successful": 2,
 *     "failed": 0,
 *     "failed_ids": [],
 *     "total_amount": 24000
 *   }
 * }
 */
export const processPayouts = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Verify admin role
    const isAdmin = req.user.roles?.includes('admin') || 
                    req.user.roles?.includes('platform_admin') || 
                    req.user.role === 'admin' || 
                    req.user.role === 'platform_admin';
                    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required to process payouts'
      });
    }

    const { payoutIds, batchSize = 50 } = req.body;

    // Validate batch size
    const parsedBatchSize = parseInt(batchSize, 10);
    if (isNaN(parsedBatchSize) || parsedBatchSize < 1 || parsedBatchSize > 100) {
      return res.status(400).json({
        success: false,
        message: 'Batch size must be between 1 and 100'
      });
    }

    // Validate payout IDs if provided
    if (payoutIds && !Array.isArray(payoutIds)) {
      return res.status(400).json({
        success: false,
        message: 'payoutIds must be an array'
      });
    }

    const result = await processPendingPayouts(adminId, {
      payoutIds,
      batchSize: parsedBatchSize
    });

    return res.status(200).json({
      success: result.processed > 0,
      message: result.processed > 0 
        ? 'Payouts processed successfully' 
        : 'No pending payouts to process',
      data: result
    });

  } catch (error) {
    console.error('❌ Process payouts error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process payouts'
    });
  }
};

// ================================================================
// GET PAYOUT SCHEDULE
// GET /api/wallet/payouts/schedule
// PRD Section 10.8 - 24-hour hold period
// ================================================================

/**
 * Get payout schedule for the authenticated host
 * 
 * @route GET /api/wallet/payouts/schedule
 * @access Private (Host only)
 * @query {string} status - Filter by payout status (pending, ready, processing, completed, failed)
 * 
 * @returns {Object} - Payout schedule
 * 
 * @example
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "schedule": [
 *       {
 *         "id": "uuid",
 *         "booking_id": "uuid",
 *         "amount": 12000,
 *         "workspace_title": "Co-working Space",
 *         "status": "pending",
 *         "scheduled_date": "2026-08-01T10:30:00.000Z",
 *         "created_at": "2026-07-31T10:30:00.000Z",
 *         "hold_period_remaining": "12 hours"
 *       }
 *     ],
 *     "summary": {
 *       "total_pending": 1,
 *       "total_ready": 0,
 *       "total_amount_pending": 12000,
 *       "total_amount_ready": 0
 *     }
 *   }
 * }
 */
export const getPayoutScheduleController = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user has host role
    if (!req.user.roles?.includes('host') && req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Only hosts can view payout schedule'
      });
    }

    const { status } = req.query;

    const schedule = await getPayoutSchedule(userId, { status });

    return res.status(200).json({
      success: true,
      data: schedule
    });

  } catch (error) {
    console.error('❌ Get payout schedule error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payout schedule'
    });
  }
};

// ================================================================
// GET WALLET STATS
// GET /api/wallet/stats
// PRD Section 11.8 - Wallet statistics
// ================================================================

/**
 * Get comprehensive wallet statistics
 * 
 * @route GET /api/wallet/stats
 * @access Private (Host only)
 * 
 * @returns {Object} - Wallet statistics
 * 
 * @example
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "total_earned": 150000,
 *     "total_withdrawn": 100000,
 *     "pending_withdrawals": 5000,
 *     "available_balance": 45000,
 *     "total_bookings": 12,
 *     "average_earning_per_booking": 12500,
 *     "last_payout_date": "2026-07-30T14:30:00.000Z",
 *     "monthly_trend": {
 *       "current_month": 45000,
 *       "previous_month": 35000,
 *       "growth": 28.57
 *     }
 *   }
 * }
 */
export const getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user has host role
    if (!req.user.roles?.includes('host') && req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Only hosts can view wallet statistics'
      });
    }

    const stats = await getWalletStats(userId);

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Get wallet stats error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallet statistics'
    });
  }
};

// ================================================================
// EXPORTS
// ================================================================

export default {
  getBalance,
  getTransactions,
  withdraw,
  getWithdrawals,
  getEarnings,
  getPendingPayouts: getPendingPayoutsController,
  processPayouts,
  getPayoutSchedule: getPayoutScheduleController,
  getStats
};