// ================================================================
// WALLET ROUTES
// Express routes for the SpaceShare Wallet System
// PRD Sections: 10.8, 11.8, 11.15
// ================================================================

import { Router } from 'express';
import { protect, authorize } from '../common/middleware/auth.middleware.js';

import {
  getBalance,
  getTransactions,
  withdraw,
  getWithdrawals,
  getEarnings,
  getPendingPayoutsController,
  processPayouts,
  getPayoutScheduleController,
  getStats
} from './wallet.controller.js';

import {
  validateTransactionFilters,
  validateWithdrawalRequest,
  validateWithdrawalFilters,
  validateEarningsPeriod,
  validatePayoutSchedule,
  validatePayoutProcessing,
  validateWalletBalance,
  validate
} from './wallet.validation.js';

const router = Router();

// ================================================================
// ALL WALLET ROUTES REQUIRE AUTHENTICATION
// ================================================================

// Apply authentication to all wallet routes
router.use(protect);

// ================================================================
// WALLET ROUTES (Host Only)
// PRD Section 11.8 - Host wallet management
// ================================================================

/**
 * @route   GET /api/wallet/balance
 * @desc    Get host wallet balance
 * @access  Private (Host only)
 * @prd     Section 11.8 - Host wallet
 */
router.get(
  '/balance',
  authorize('host', 'admin', 'platform_admin'),
  validateWalletBalance,
  validate,
  getBalance
);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get paginated transaction history
 * @access  Private (Host only)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10, max: 50)
 * @query   type - Filter by transaction type
 * @query   status - Filter by transaction status
 * @query   startDate - Filter by start date
 * @query   endDate - Filter by end date
 * @prd     Section 11.8 - Transaction history
 */
router.get(
  '/transactions',
  authorize('host', 'admin', 'platform_admin'),
  validateTransactionFilters,
  validate,
  getTransactions
);

/**
 * @route   POST /api/wallet/withdraw
 * @desc    Request a withdrawal from wallet
 * @access  Private (Host only)
 * @body    { amount, bankCode, accountNumber, accountName }
 * @prd     Section 11.8 - Host withdrawal requests
 */
router.post(
  '/withdraw',
  authorize('host', 'admin', 'platform_admin'),
  validateWithdrawalRequest,
  validate,
  withdraw
);

/**
 * @route   GET /api/wallet/withdrawals
 * @desc    Get withdrawal history
 * @access  Private (Host only)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10, max: 50)
 * @query   status - Filter by withdrawal status
 * @query   startDate - Filter by start date
 * @query   endDate - Filter by end date
 * @prd     Section 11.8 - Withdrawal history
 */
router.get(
  '/withdrawals',
  authorize('host', 'admin', 'platform_admin'),
  validateWithdrawalFilters,
  validate,
  getWithdrawals
);

/**
 * @route   GET /api/wallet/earnings
 * @desc    Get earnings summary (daily/weekly/monthly/yearly)
 * @access  Private (Host only)
 * @query   period - Period for summary (daily, weekly, monthly, yearly) - default: monthly
 * @prd     Section 11.8 - Track earnings
 */
router.get(
  '/earnings',
  authorize('host', 'admin', 'platform_admin'),
  validateEarningsPeriod,
  validate,
  getEarnings
);

/**
 * @route   GET /api/wallet/payouts/pending
 * @desc    Get pending payouts for the authenticated host
 * @access  Private (Host only)
 * @prd     Section 11.8 - Pending payouts
 */
router.get(
  '/payouts/pending',
  authorize('host', 'admin', 'platform_admin'),
  getPendingPayoutsController
);

/**
 * @route   GET /api/wallet/payouts/schedule
 * @desc    Get payout schedule (24-hour hold tracking)
 * @access  Private (Host only)
 * @query   status - Filter by payout status
 * @prd     Section 10.8 - 24-hour hold period
 */
router.get(
  '/payouts/schedule',
  authorize('host', 'admin', 'platform_admin'),
  validatePayoutSchedule,
  validate,
  getPayoutScheduleController
);

/**
 * @route   GET /api/wallet/stats
 * @desc    Get comprehensive wallet statistics
 * @access  Private (Host only)
 * @prd     Section 11.8 - Wallet statistics
 */
router.get(
  '/stats',
  authorize('host', 'admin', 'platform_admin'),
  getStats
);

// ================================================================
// ADMIN ONLY ROUTES
// PRD Section 11.15 - Admin payment handling
// ================================================================

/**
 * @route   POST /api/wallet/payouts/process
 * @desc    Process pending payouts (Admin only)
 * @access  Private (Admin only)
 * @body    { payoutIds, batchSize }
 * @prd     Section 11.15 - Admin payment handling
 */
router.post(
  '/payouts/process',
  authorize('admin', 'platform_admin'),
  validatePayoutProcessing,
  validate,
  processPayouts
);

// ================================================================
// EXPORTS
// ================================================================

export default router;