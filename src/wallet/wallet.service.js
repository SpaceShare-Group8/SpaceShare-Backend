// ================================================================
// WALLET SERVICE
// Core business logic for the SpaceShare Wallet System
// PRD Sections: 10.8, 11.8, 11.15
// ================================================================

import crypto from 'crypto';
import pool from '../common/config/db.js';
import {
  WITHDRAWAL_STATUS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  PAYOUT_SCHEDULE_STATUS,
  CURRENCY,
  WITHDRAWAL_LIMITS,
  PAYOUT_CONSTANTS,
  WALLET_ERROR_MESSAGES,
  isValidWithdrawalAmount,
  getHoldPeriodEndDate,
  isPayoutReady,
  getBankNameByCode
} from './wallet.constants.js';

import {
  findWalletByHostId,
  createWallet,
  updateWalletBalance,
  getWalletWithLock,
  createTransaction,
  findTransactionsByWallet,
  findTransactionById,
  getTransactionSummary,
  createWithdrawalRequest,
  findWithdrawalRequests,
  updateWithdrawalStatus,
  getPendingWithdrawals,
  getWithdrawalLimits,
  updateWithdrawalUsage,
  createPayoutSchedule,
  getPendingPayouts as getPendingPayoutsRepo,
  markPayoutCompleted,
  markPayoutFailed,
  getPayoutSchedule as getPayoutScheduleRepo,
  getTotalPendingPayouts
} from './wallet.repository.js';

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Generate a unique reference for transactions
 * @param {string} prefix - Reference prefix
 * @returns {string} - Unique reference
 */
const generateReference = (prefix = 'WTH') => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}-${date}-${random}`;
};

/**
 * Create a notification record
 */
const createNotification = async (userId, type, title, message, metadata = {}) => {
  const query = `
    INSERT INTO notifications (user_id, type, title, message, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id
  `;
  const result = await pool.query(query, [userId, type, title, message, JSON.stringify(metadata)]);
  return result.rows[0];
};

/**
 * Log system action
 */
const logSystemAction = async (client, action, details) => {
  const query = `
    INSERT INTO system_logs (action, details, created_at)
    VALUES ($1, $2, NOW())
  `;
  await client.query(query, [action, JSON.stringify(details)]);
};

/**
 * Log admin action
 */
const logAdminAction = async (client, adminId, action, details) => {
  const query = `
    INSERT INTO admin_logs (admin_id, action, details, created_at)
    VALUES ($1, $2, $3, NOW())
  `;
  await client.query(query, [adminId, action, JSON.stringify(details)]);
};

/**
 * Format transaction for API response
 */
const formatTransactionResponse = (transaction) => {
  return {
    id: transaction.id,
    booking_id: transaction.booking_id,
    amount: parseFloat(transaction.amount),
    commission_amount: parseFloat(transaction.commission_amount || 0),
    type: transaction.type,
    status: transaction.status,
    reference: transaction.reference,
    payment_method: transaction.payment_method || null,
    provider_fee: parseFloat(transaction.provider_fee || 0),
    metadata: transaction.metadata || {},
    created_at: transaction.created_at,
    updated_at: transaction.updated_at
  };
};

/**
 * Format withdrawal for API response
 */
const formatWithdrawalResponse = (withdrawal) => {
  return {
    id: withdrawal.id,
    amount: parseFloat(withdrawal.amount),
    status: withdrawal.status,
    reference: withdrawal.reference,
    bank_code: withdrawal.bank_code,
    account_number: withdrawal.account_number,
    account_name: withdrawal.account_name,
    bank_name: getBankNameByCode(withdrawal.bank_code) || withdrawal.bank_code,
    processed_at: withdrawal.processed_at || null,
    created_at: withdrawal.created_at,
    updated_at: withdrawal.updated_at
  };
};

// ================================================================
// BALANCE OPERATIONS
// PRD Section 11.8 - Host wallet
// ================================================================

/**
 * Get wallet balance with pending withdrawals and total earned
 * @param {string} hostId - Host user ID
 * @returns {Promise<Object>} - Wallet data
 */
export const getWalletBalance = async (hostId) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  // Get or create wallet
  let wallet = await findWalletByHostId(hostId);
  if (!wallet) {
    wallet = await createWallet(hostId);
  }

  // Get pending withdrawals
  const pendingWithdrawals = await getTotalPendingPayouts(hostId);

  // Get total earned (completed payouts)
  const earnedQuery = `
    SELECT COALESCE(SUM(amount), 0) as total_earned
    FROM payout_schedules
    WHERE host_id = $1 AND status = 'completed'
  `;
  const earnedResult = await pool.query(earnedQuery, [hostId]);
  const totalEarned = parseFloat(earnedResult.rows[0].total_earned || 0);

  return {
    balance: parseFloat(wallet.balance),
    currency: wallet.currency || CURRENCY.DEFAULT,
    pending_withdrawals: pendingWithdrawals,
    total_earned: totalEarned,
    available_balance: parseFloat(wallet.balance) - pendingWithdrawals,
    last_updated: wallet.updated_at
  };
};

/**
 * Get paginated transaction history
 * @param {string} hostId - Host user ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} - Paginated transactions
 */
export const getTransactionHistory = async (hostId, filters = {}) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  // Get or create wallet
  let wallet = await findWalletByHostId(hostId);
  if (!wallet) {
    wallet = await createWallet(hostId);
  }

  const result = await findTransactionsByWallet(wallet.id, filters);

  return {
    transactions: result.transactions.map(formatTransactionResponse),
    meta: result.meta
  };
};

/**
 * Get earnings summary by period
 * @param {string} hostId - Host user ID
 * @param {string} period - Period (daily, weekly, monthly, yearly)
 * @returns {Promise<Object>} - Earnings summary
 */
export const getEarningsSummary = async (hostId, period = 'monthly') => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  // Get or create wallet
  let wallet = await findWalletByHostId(hostId);
  if (!wallet) {
    wallet = await createWallet(hostId);
  }

  const summary = await getTransactionSummary(wallet.id, period);

  // Get additional stats
  const statsQuery = `
    SELECT 
      COUNT(DISTINCT booking_id) as total_bookings,
      AVG(amount) as average_per_booking
    FROM transactions
    WHERE wallet_id = $1
      AND type = 'payment'
      AND status = 'completed'
      AND created_at >= $2
  `;
  const statsResult = await pool.query(statsQuery, [wallet.id, summary.start_date]);

  return {
    period: summary.period,
    start_date: summary.start_date,
    end_date: summary.end_date,
    total_earnings: summary.total_earnings,
    total_payouts: summary.total_payouts,
    total_refunds: summary.total_refunds,
    total_commission: summary.total_commission,
    net_earnings: summary.net_earnings,
    total_bookings: parseInt(statsResult.rows[0]?.total_bookings || 0, 10),
    average_per_booking: parseFloat(statsResult.rows[0]?.average_per_booking || 0),
    growth_percentage: summary.growth_percentage,
    top_earning: summary.top_earning
  };
};

// ================================================================
// WITHDRAWAL OPERATIONS
// PRD Section 11.8 - Host withdrawal requests
// ================================================================

/**
 * Validate withdrawal amount
 * @param {number} amount - Withdrawal amount
 * @returns {Object} - Validation result
 */
export const validateWithdrawalAmount = (amount) => {
  return isValidWithdrawalAmount(amount);
};

/**
 * Check daily withdrawal limit
 * @param {string} hostId - Host user ID
 * @returns {Promise<Object>} - Daily limit check result
 */
export const checkDailyWithdrawalLimit = async (hostId) => {
  const limits = await getWithdrawalLimits(hostId);
  const remaining = limits.daily_remaining;

  return {
    limit: limits.daily_limit,
    used: limits.daily_used,
    remaining: remaining,
    is_exceeded: remaining <= 0,
    reset_at: limits.daily_reset_at
  };
};

/**
 * Check weekly withdrawal limit
 * @param {string} hostId - Host user ID
 * @returns {Promise<Object>} - Weekly limit check result
 */
export const checkWeeklyWithdrawalLimit = async (hostId) => {
  const limits = await getWithdrawalLimits(hostId);
  const remaining = limits.weekly_remaining;

  return {
    limit: limits.weekly_limit,
    used: limits.weekly_used,
    remaining: remaining,
    is_exceeded: remaining <= 0,
    reset_at: limits.weekly_reset_at
  };
};

/**
 * Request a withdrawal from wallet
 * @param {string} hostId - Host user ID
 * @param {Object} data - Withdrawal data
 * @param {number} data.amount - Withdrawal amount
 * @param {string} data.bankCode - Bank code
 * @param {string} data.accountNumber - Account number
 * @param {string} data.accountName - Account holder name
 * @returns {Promise<Object>} - Created withdrawal request
 */
export const requestWithdrawal = async (hostId, data) => {
  const { amount, bankCode, accountNumber, accountName } = data;

  if (!hostId) {
    throw new Error('hostId is required');
  }

  // Validate amount
  const amountValidation = validateWithdrawalAmount(amount);
  if (!amountValidation.valid) {
    throw new Error(amountValidation.message);
  }

  // Get or create wallet
  let wallet = await findWalletByHostId(hostId);
  if (!wallet) {
    wallet = await createWallet(hostId);
  }

  // Start transaction
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock wallet for transaction
    const lockedWallet = await getWalletWithLock(hostId, client);

    // Check sufficient balance
    const currentBalance = parseFloat(lockedWallet.balance);
    if (currentBalance < amount) {
      throw new Error(WALLET_ERROR_MESSAGES.INSUFFICIENT_BALANCE);
    }

    // Check daily withdrawal limit
    const dailyLimit = await checkDailyWithdrawalLimit(hostId);
    if (dailyLimit.is_exceeded) {
      throw new Error(WALLET_ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED);
    }

    // Check weekly withdrawal limit
    const weeklyLimit = await checkWeeklyWithdrawalLimit(hostId);
    if (weeklyLimit.is_exceeded) {
      throw new Error(WALLET_ERROR_MESSAGES.WEEKLY_LIMIT_EXCEEDED);
    }

    // Check if amount exceeds remaining daily limit
    if (amount > dailyLimit.remaining) {
      throw new Error(`Daily limit exceeded. Remaining: ₦${dailyLimit.remaining.toFixed(2)}`);
    }

    // Check if amount exceeds remaining weekly limit
    if (amount > weeklyLimit.remaining) {
      throw new Error(`Weekly limit exceeded. Remaining: ₦${weeklyLimit.remaining.toFixed(2)}`);
    }

    // Generate reference
    const reference = generateReference('WTH');

    // Create withdrawal request
    const withdrawal = await createWithdrawalRequest({
      hostId,
      amount,
      bankCode,
      accountNumber,
      accountName,
      reference
    });

    // Deduct from wallet balance
    await updateWalletBalance(hostId, amount, 'subtract');

    // Update withdrawal usage
    await updateWithdrawalUsage(hostId, amount);

    // Create transaction record
    const transaction = await createTransaction({
      bookingId: null, // Withdrawals are not tied to a specific booking
      walletId: wallet.id,
      amount: amount,
      commissionAmount: 0,
      type: TRANSACTION_TYPES.PAYOUT,
      status: TRANSACTION_STATUS.PENDING,
      reference: reference,
      paymentMethod: 'bank_transfer',
      providerFee: 0,
      metadata: {
        withdrawal_id: withdrawal.id,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName
      }
    });

    // Log system action
    await logSystemAction(client, 'withdrawal_requested', {
      hostId,
      amount,
      reference,
      withdrawal_id: withdrawal.id
    });

    // Create notification for host
    await createNotification(
      hostId,
      'withdrawal_requested',
      'Withdrawal Request Submitted 💰',
      `Your withdrawal request of ₦${amount.toFixed(2)} has been submitted and is pending processing.`,
      { withdrawalId: withdrawal.id, amount, reference }
    );

    await client.query('COMMIT');

    return formatWithdrawalResponse(withdrawal);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get withdrawal history
 * @param {string} hostId - Host user ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} - Paginated withdrawal history
 */
export const getWithdrawalHistory = async (hostId, filters = {}) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  const result = await findWithdrawalRequests(hostId, filters);

  return {
    withdrawals: result.withdrawals.map(formatWithdrawalResponse),
    meta: result.meta
  };
};

// ================================================================
// PAYOUT OPERATIONS
// PRD Section 10.8 - 24-hour hold period
// ================================================================

/**
 * Schedule a host payout with 24-hour hold
 * @param {Object} client - Database client (for transactions)
 * @param {string} hostId - Host user ID
 * @param {string} bookingId - Booking ID
 * @param {number} amount - Payout amount
 * @returns {Promise<Object>} - Payout schedule record
 */
export const scheduleHostPayout = async (client, hostId, bookingId, amount) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  if (!bookingId) {
    throw new Error('bookingId is required');
  }

  if (!amount || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  // Ensure wallet exists
  let wallet = await findWalletByHostId(hostId);
  if (!wallet) {
    wallet = await createWallet(hostId);
  }

  // Create payout schedule with 24-hour hold
  const payoutSchedule = await createPayoutSchedule({
    hostId,
    bookingId,
    amount,
    holdHours: PAYOUT_CONSTANTS.HOLD_PERIOD_HOURS
  });

  // Log system action
  await logSystemAction(client, 'payout_scheduled', {
    hostId,
    bookingId,
    amount,
    scheduled_date: payoutSchedule.scheduled_date,
    payout_id: payoutSchedule.id
  });

  return payoutSchedule;
};

/**
 * Process pending payouts (after 24-hour hold)
 * @param {string} adminId - Admin user ID
 * @param {Object} options - Processing options
 * @param {string[]} options.payoutIds - Specific payout IDs to process
 * @param {number} options.batchSize - Batch size
 * @returns {Promise<Object>} - Processing results
 */
export const processPendingPayouts = async (adminId, options = {}) => {
  const { payoutIds, batchSize = PAYOUT_CONSTANTS.BATCH_SIZE } = options;

  if (!adminId) {
    throw new Error('adminId is required');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get payouts to process
    let payouts;
    if (payoutIds && payoutIds.length > 0) {
      const placeholders = payoutIds.map((_, i) => `$${i + 1}`).join(',');
      const query = `
        SELECT 
          ps.id,
          ps.host_id,
          ps.booking_id,
          ps.amount,
          ps.status,
          ps.scheduled_date,
          u.full_name as host_name,
          u.email as host_email
        FROM payout_schedules ps
        JOIN users u ON ps.host_id = u.id
        WHERE ps.id IN (${placeholders})
          AND ps.status = 'pending'
          AND ps.scheduled_date <= NOW()
      `;
      const result = await client.query(query, payoutIds);
      payouts = result.rows;
    } else {
      payouts = await getPendingPayoutsRepo({ limit: batchSize });
    }

    if (payouts.length === 0) {
      await client.query('COMMIT');
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        failed_ids: [],
        total_amount: 0
      };
    }

    let successful = 0;
    let failed = 0;
    const failedIds = [];
    let totalAmount = 0;

    // Process each payout
    for (const payout of payouts) {
      try {
        // Verify payout is ready
        if (!isPayoutReady(payout.scheduled_date)) {
          continue;
        }

        // Update status to ready
        await client.query(
          `UPDATE payout_schedules 
           SET status = 'ready', updated_at = NOW() 
           WHERE id = $1 AND status = 'pending'`,
          [payout.id]
        );

        // Here you would integrate with your payment provider
        // to actually send money to the host's bank account
        // For now, we simulate success

        // Mark as completed
        await markPayoutCompleted(payout.id);

        // Create transaction record
        // Get wallet
        const wallet = await findWalletByHostId(payout.host_id);
        if (wallet) {
          await createTransaction({
            bookingId: payout.booking_id,
            walletId: wallet.id,
            amount: payout.amount,
            commissionAmount: 0,
            type: TRANSACTION_TYPES.PAYOUT,
            status: TRANSACTION_STATUS.COMPLETED,
            reference: generateReference('PAY'),
            paymentMethod: 'bank_transfer',
            providerFee: 0,
            metadata: {
              payout_id: payout.id,
              scheduled_date: payout.scheduled_date
            }
          });
        }

        // Create notification for host
        await createNotification(
          payout.host_id,
          'payout_completed',
          'Payout Completed 💰',
          `Your payout of ₦${parseFloat(payout.amount).toFixed(2)} has been sent to your bank account.`,
          { payoutId: payout.id, amount: payout.amount }
        );

        successful++;
        totalAmount += parseFloat(payout.amount);

        // Log system action
        await logSystemAction(client, 'payout_processed', {
          payout_id: payout.id,
          host_id: payout.host_id,
          amount: payout.amount,
          admin_id: adminId
        });

      } catch (error) {
        console.error('❌ Payout processing error:', error.message);
        failed++;
        failedIds.push(payout.id);

        // Mark as failed
        await markPayoutFailed(payout.id, error.message);

        // Log failure
        await logSystemAction(client, 'payout_failed', {
          payout_id: payout.id,
          host_id: payout.host_id,
          amount: payout.amount,
          reason: error.message,
          admin_id: adminId
        });
      }
    }

    // Log admin action
    await logAdminAction(client, adminId, 'process_payouts', {
      processed: payouts.length,
      successful,
      failed,
      total_amount: totalAmount,
      failed_ids: failedIds
    });

    await client.query('COMMIT');

    return {
      processed: payouts.length,
      successful,
      failed,
      failed_ids: failedIds,
      total_amount: totalAmount
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Process pending payouts error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get payout schedule for a host
 * @param {string} hostId - Host user ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} - Payout schedule
 */
export const getPayoutSchedule = async (hostId, filters = {}) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  const result = await getPayoutScheduleRepo(hostId, filters);

  return result;
};

/**
 * Get pending payouts for a host
 * @param {string} hostId - Host user ID
 * @returns {Promise<Object>} - Pending payouts
 */
export const getPendingPayouts = async (hostId) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  const query = `
    SELECT 
      ps.id,
      ps.booking_id,
      ps.amount,
      ps.status,
      ps.scheduled_date,
      ps.created_at,
      w.title as workspace_title,
      CASE 
        WHEN ps.scheduled_date <= NOW() THEN 'ready'
        ELSE 'pending'
      END as readiness
    FROM payout_schedules ps
    LEFT JOIN bookings b ON ps.booking_id = b.id
    LEFT JOIN workspaces w ON b.workspace_id = w.id
    WHERE ps.host_id = $1
      AND ps.status IN ('pending', 'ready', 'processing')
    ORDER BY ps.scheduled_date ASC
  `;

  const result = await pool.query(query, [hostId]);

  const payouts = result.rows.map(payout => ({
    id: payout.id,
    booking_id: payout.booking_id,
    amount: parseFloat(payout.amount),
    workspace_title: payout.workspace_title || 'Unknown Space',
    status: payout.status,
    readiness: payout.readiness,
    scheduled_date: payout.scheduled_date,
    created_at: payout.created_at,
    hold_period_remaining: isPayoutReady(payout.scheduled_date) 
      ? 'Ready for processing' 
      : `${Math.ceil((new Date(payout.scheduled_date) - new Date()) / (1000 * 60 * 60))} hours`
  }));

  const totalPending = payouts.reduce((sum, p) => sum + p.amount, 0);

  return {
    pending_payouts: payouts,
    total_pending: payouts.length,
    total_amount: totalPending
  };
};

// ================================================================
// ADMIN OPERATIONS
// PRD Section 11.15 - Admin payment handling
// ================================================================

/**
 * Get all pending withdrawals (Admin only)
 * @param {string} adminId - Admin user ID
 * @returns {Promise<Array>} - Pending withdrawals
 */
export const getAllPendingWithdrawals = async (adminId) => {
  if (!adminId) {
    throw new Error('adminId is required');
  }

  const withdrawals = await getPendingWithdrawals({ limit: 100 });

  return withdrawals.map(w => ({
    ...w,
    amount: parseFloat(w.amount),
    current_balance: parseFloat(w.current_balance || 0)
  }));
};

/**
 * Process a batch of withdrawals (Admin only)
 * @param {string} adminId - Admin user ID
 * @param {string[]} withdrawalIds - Withdrawal IDs to process
 * @returns {Promise<Object>} - Processing results
 */
export const processWithdrawalBatch = async (adminId, withdrawalIds) => {
  if (!adminId) {
    throw new Error('adminId is required');
  }

  if (!withdrawalIds || withdrawalIds.length === 0) {
    throw new Error('No withdrawal IDs provided');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let successful = 0;
    let failed = 0;
    const failedIds = [];
    let totalAmount = 0;

    for (const withdrawalId of withdrawalIds) {
      try {
        // Get withdrawal details
        const withdrawalQuery = `
          SELECT host_id, amount, reference
          FROM withdrawal_requests
          WHERE id = $1 AND status = 'pending'
        `;
        const withdrawalResult = await client.query(withdrawalQuery, [withdrawalId]);

        if (withdrawalResult.rows.length === 0) {
          failed++;
          failedIds.push(withdrawalId);
          continue;
        }

        const withdrawal = withdrawalResult.rows[0];

        // Update withdrawal status to processing
        await updateWithdrawalStatus(withdrawalId, WITHDRAWAL_STATUS.PROCESSING);

        // Here you would integrate with your payment provider
        // to actually send money to the host's bank account
        // For now, we simulate success

        // Mark as completed
        await updateWithdrawalStatus(withdrawalId, WITHDRAWAL_STATUS.COMPLETED);

        // Create notification for host
        await createNotification(
          withdrawal.host_id,
          'withdrawal_completed',
          'Withdrawal Completed 💰',
          `Your withdrawal of ₦${parseFloat(withdrawal.amount).toFixed(2)} has been sent to your bank account.`,
          { withdrawalId, amount: withdrawal.amount }
        );

        successful++;
        totalAmount += parseFloat(withdrawal.amount);

        // Log system action
        await logSystemAction(client, 'withdrawal_processed', {
          withdrawal_id: withdrawalId,
          host_id: withdrawal.host_id,
          amount: withdrawal.amount,
          admin_id: adminId
        });

      } catch (error) {
        console.error('❌ Withdrawal processing error:', error.message);
        failed++;
        failedIds.push(withdrawalId);

        // Update withdrawal status to failed
        await updateWithdrawalStatus(withdrawalId, WITHDRAWAL_STATUS.FAILED, {
          reason: error.message
        });

        // Log failure
        await logSystemAction(client, 'withdrawal_failed', {
          withdrawal_id: withdrawalId,
          reason: error.message,
          admin_id: adminId
        });
      }
    }

    // Log admin action
    await logAdminAction(client, adminId, 'process_withdrawals', {
      total: withdrawalIds.length,
      successful,
      failed,
      total_amount: totalAmount,
      failed_ids: failedIds
    });

    await client.query('COMMIT');

    return {
      processed: withdrawalIds.length,
      successful,
      failed,
      failed_ids: failedIds,
      total_amount: totalAmount
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Process withdrawal batch error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Admin manual adjustment to wallet
 * @param {string} adminId - Admin user ID
 * @param {string} hostId - Host user ID
 * @param {number} amount - Adjustment amount (positive = add, negative = subtract)
 * @param {string} reason - Adjustment reason
 * @returns {Promise<Object>} - Updated wallet
 */
export const manualAdjustment = async (adminId, hostId, amount, reason) => {
  if (!adminId) {
    throw new Error('adminId is required');
  }

  if (!hostId) {
    throw new Error('hostId is required');
  }

  if (!amount || amount === 0) {
    throw new Error('Amount must be non-zero');
  }

  if (!reason) {
    throw new Error('Reason is required for manual adjustment');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get or create wallet
    let wallet = await findWalletByHostId(hostId);
    if (!wallet) {
      wallet = await createWallet(hostId);
    }

    // Lock wallet for transaction
    await getWalletWithLock(hostId, client);

    const operation = amount > 0 ? 'add' : 'subtract';
    const absAmount = Math.abs(amount);

    // Update wallet balance
    const updatedWallet = await updateWalletBalance(hostId, absAmount, operation);

    // Create transaction record
    const transaction = await createTransaction({
      bookingId: null,
      walletId: wallet.id,
      amount: absAmount,
      commissionAmount: 0,
      type: TRANSACTION_TYPES.ADJUSTMENT,
      status: TRANSACTION_STATUS.COMPLETED,
      reference: generateReference('ADJ'),
      paymentMethod: 'admin_adjustment',
      providerFee: 0,
      metadata: {
        admin_id: adminId,
        operation: operation,
        reason: reason,
        previous_balance: wallet.balance
      }
    });

    // Log admin action
    await logAdminAction(client, adminId, 'manual_adjustment', {
      hostId,
      amount: amount,
      operation,
      reason,
      previous_balance: wallet.balance,
      new_balance: updatedWallet.balance
    });

    // Log system action
    await logSystemAction(client, 'manual_adjustment', {
      hostId,
      amount: amount,
      operation,
      reason,
      admin_id: adminId
    });

    // Create notification for host
    await createNotification(
      hostId,
      'wallet_adjusted',
      `Wallet ${operation === 'add' ? 'Credit' : 'Debit'} 🔄`,
      `Your wallet has been ${operation === 'add' ? 'credited' : 'debited'} with ₦${absAmount.toFixed(2)}. Reason: ${reason}`,
      { amount: absAmount, operation, reason }
    );

    await client.query('COMMIT');

    return {
      balance: parseFloat(updatedWallet.balance),
      currency: updatedWallet.currency || CURRENCY.DEFAULT,
      operation: operation,
      amount: absAmount,
      reason: reason,
      previous_balance: parseFloat(wallet.balance),
      updated_at: updatedWallet.updated_at
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Manual adjustment error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// ================================================================
// WALLET STATS
// PRD Section 11.8 - Wallet statistics
// ================================================================

/**
 * Get comprehensive wallet statistics
 * @param {string} hostId - Host user ID
 * @returns {Promise<Object>} - Wallet statistics
 */
export const getWalletStats = async (hostId) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  // Get or create wallet
  let wallet = await findWalletByHostId(hostId);
  if (!wallet) {
    wallet = await createWallet(hostId);
  }

  // Get total earned
  const earnedQuery = `
    SELECT COALESCE(SUM(amount), 0) as total_earned
    FROM payout_schedules
    WHERE host_id = $1 AND status = 'completed'
  `;
  const earnedResult = await pool.query(earnedQuery, [hostId]);

  // Get total withdrawn
  const withdrawnQuery = `
    SELECT COALESCE(SUM(amount), 0) as total_withdrawn
    FROM withdrawal_requests
    WHERE host_id = $1 AND status = 'completed'
  `;
  const withdrawnResult = await pool.query(withdrawnQuery, [hostId]);

  // Get pending withdrawals
  const pendingQuery = `
    SELECT COALESCE(SUM(amount), 0) as total_pending
    FROM withdrawal_requests
    WHERE host_id = $1 AND status IN ('pending', 'processing')
  `;
  const pendingResult = await pool.query(pendingQuery, [hostId]);

  // Get total bookings
  const bookingsQuery = `
    SELECT COUNT(DISTINCT b.id) as total_bookings
    FROM bookings b
    JOIN workspaces w ON b.workspace_id = w.id
    WHERE w.host_id = $1 AND b.status = 'completed'
  `;
  const bookingsResult = await pool.query(bookingsQuery, [hostId]);

  // Get last payout date
  const lastPayoutQuery = `
    SELECT completed_date
    FROM payout_schedules
    WHERE host_id = $1 AND status = 'completed'
    ORDER BY completed_date DESC
    LIMIT 1
  `;
  const lastPayoutResult = await pool.query(lastPayoutQuery, [hostId]);

  // Get monthly trend
  const trendQuery = `
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COALESCE(SUM(amount), 0) as total
    FROM payout_schedules
    WHERE host_id = $1 AND status = 'completed'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
    LIMIT 2
  `;
  const trendResult = await pool.query(trendQuery, [hostId]);
  const trends = trendResult.rows;

  let growth = 0;
  if (trends.length === 2) {
    const current = parseFloat(trends[0].total);
    const previous = parseFloat(trends[1].total);
    if (previous > 0) {
      growth = ((current - previous) / previous) * 100;
    }
  }

  return {
    total_earned: parseFloat(earnedResult.rows[0].total_earned || 0),
    total_withdrawn: parseFloat(withdrawnResult.rows[0].total_withdrawn || 0),
    pending_withdrawals: parseFloat(pendingResult.rows[0].total_pending || 0),
    available_balance: parseFloat(wallet.balance),
    total_bookings: parseInt(bookingsResult.rows[0].total_bookings || 0, 10),
    average_earning_per_booking: parseInt(bookingsResult.rows[0].total_bookings || 0, 10) > 0
      ? parseFloat(earnedResult.rows[0].total_earned || 0) / parseInt(bookingsResult.rows[0].total_bookings || 0, 10)
      : 0,
    last_payout_date: lastPayoutResult.rows[0]?.completed_date || null,
    monthly_trend: {
      current_month: trends.length > 0 ? parseFloat(trends[0].total) : 0,
      previous_month: trends.length > 1 ? parseFloat(trends[1].total) : 0,
      growth: parseFloat(growth.toFixed(2))
    }
  };
};

// ================================================================
// EXPORTS
// ================================================================

export default {
  // Balance Operations
  getWalletBalance,
  getTransactionHistory,
  getEarningsSummary,

  // Withdrawal Operations
  requestWithdrawal,
  getWithdrawalHistory,
  validateWithdrawalAmount,
  checkDailyWithdrawalLimit,
  checkWeeklyWithdrawalLimit,

  // Payout Operations
  scheduleHostPayout,
  processPendingPayouts,
  getPayoutSchedule,
  getPendingPayouts,

  // Admin Operations
  getAllPendingWithdrawals,
  processWithdrawalBatch,
  manualAdjustment,

  // Stats
  getWalletStats,

  // Helpers
  formatTransactionResponse
};