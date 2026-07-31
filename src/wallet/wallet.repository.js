// ================================================================
// WALLET REPOSITORY
// Database operations for the SpaceShare Wallet System
// PRD Sections: 10.8, 11.8, 11.15
// ================================================================

import pool from '../common/config/db.js';
import {
  WITHDRAWAL_STATUS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  PAYOUT_SCHEDULE_STATUS,
  CURRENCY
} from './wallet.constants.js';

// ================================================================
// WALLET OPERATIONS
// PRD Section 11.8 - Wallet management
// ================================================================

/**
 * Get wallet by host ID
 * @param {string} hostId - Host user ID
 * @returns {Promise<Object|null>} - Wallet record or null
 */
export const findWalletByHostId = async (hostId) => {
  if (!hostId) return null;

  const query = `
    SELECT 
      id,
      host_id,
      balance,
      currency,
      created_at,
      updated_at
    FROM wallets
    WHERE host_id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [hostId]);
  return result.rows[0] || null;
};

/**
 * Create a new wallet for a host
 * @param {string} hostId - Host user ID
 * @param {string} currency - Currency code (default: NGN)
 * @returns {Promise<Object>} - Created wallet record
 */
export const createWallet = async (hostId, currency = CURRENCY.DEFAULT) => {
  if (!hostId) {
    throw new Error('hostId is required to create a wallet');
  }

  const query = `
    INSERT INTO wallets (
      host_id,
      balance,
      currency,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, NOW(), NOW())
    RETURNING 
      id,
      host_id,
      balance,
      currency,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [hostId, 0, currency]);
  return result.rows[0];
};

/**
 * Update wallet balance (add or subtract)
 * @param {string} hostId - Host user ID
 * @param {number} amount - Amount to add or subtract
 * @param {string} operation - 'add' or 'subtract'
 * @returns {Promise<Object>} - Updated wallet record
 */
export const updateWalletBalance = async (hostId, amount, operation = 'add') => {
  if (!hostId) {
    throw new Error('hostId is required to update wallet balance');
  }

  if (!amount || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const operator = operation === 'add' ? '+' : '-';
  const query = `
    UPDATE wallets
    SET 
      balance = balance ${operator} $1,
      updated_at = NOW()
    WHERE host_id = $2
    RETURNING 
      id,
      host_id,
      balance,
      currency,
      updated_at
  `;

  const result = await pool.query(query, [amount, hostId]);

  if (result.rows.length === 0) {
    throw new Error('Wallet not found for this host');
  }

  return result.rows[0];
};

/**
 * Get wallet with row lock for transaction operations
 * @param {string} hostId - Host user ID
 * @param {object} client - Database client (for transactions)
 * @returns {Promise<Object>} - Wallet record with lock
 */
export const getWalletWithLock = async (hostId, client = pool) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  const query = `
    SELECT 
      id,
      host_id,
      balance,
      currency,
      created_at,
      updated_at
    FROM wallets
    WHERE host_id = $1
    FOR UPDATE
  `;

  const result = await client.query(query, [hostId]);

  if (result.rows.length === 0) {
    throw new Error('Wallet not found for this host');
  }

  return result.rows[0];
};

// ================================================================
// TRANSACTION OPERATIONS
// PRD Section 11.8 - Transaction history
// ================================================================

/**
 * Create a transaction record
 * @param {Object} data - Transaction data
 * @param {string} data.bookingId - Booking ID
 * @param {string} data.walletId - Wallet ID
 * @param {number} data.amount - Transaction amount
 * @param {number} data.commissionAmount - Commission amount (if applicable)
 * @param {string} data.type - Transaction type (payment, refund, payout, etc.)
 * @param {string} data.status - Transaction status
 * @param {string} data.reference - Unique transaction reference
 * @param {string} data.paymentMethod - Payment method (card, bank_transfer, etc.)
 * @param {number} data.providerFee - Provider fee (if applicable)
 * @param {Object} data.metadata - Additional metadata
 * @returns {Promise<Object>} - Created transaction record
 */
export const createTransaction = async (data) => {
  const {
    bookingId,
    walletId,
    amount,
    commissionAmount = 0,
    type,
    status,
    reference,
    paymentMethod = null,
    providerFee = 0,
    metadata = {}
  } = data;

  if (!bookingId) {
    throw new Error('bookingId is required');
  }

  if (!walletId) {
    throw new Error('walletId is required');
  }

  if (!amount || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  if (!type) {
    throw new Error('Transaction type is required');
  }

  if (!status) {
    throw new Error('Transaction status is required');
  }

  if (!reference) {
    throw new Error('Transaction reference is required');
  }

  const query = `
    INSERT INTO transactions (
      booking_id,
      wallet_id,
      amount,
      commission_amount,
      type,
      status,
      reference,
      payment_method,
      provider_fee,
      metadata,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    RETURNING 
      id,
      booking_id,
      wallet_id,
      amount,
      commission_amount,
      type,
      status,
      reference,
      payment_method,
      provider_fee,
      metadata,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [
    bookingId,
    walletId,
    amount,
    commissionAmount,
    type,
    status,
    reference,
    paymentMethod,
    providerFee,
    JSON.stringify(metadata)
  ]);

  return result.rows[0];
};

/**
 * Find transactions by wallet ID with filters
 * @param {string} walletId - Wallet ID
 * @param {Object} filters - Filter options
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Items per page
 * @param {string} filters.type - Transaction type filter
 * @param {string} filters.status - Transaction status filter
 * @param {string} filters.startDate - Start date filter
 * @param {string} filters.endDate - End date filter
 * @returns {Promise<Object>} - Transactions and metadata
 */
export const findTransactionsByWallet = async (walletId, filters = {}) => {
  if (!walletId) {
    throw new Error('walletId is required');
  }

  const {
    page = 1,
    limit = 10,
    type,
    status,
    startDate,
    endDate
  } = filters;

  const offset = (page - 1) * limit;
  const conditions = ['wallet_id = $1'];
  const params = [walletId];
  let paramIndex = 2;

  if (type) {
    conditions.push(`type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }

  if (status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (startDate) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM transactions
    WHERE ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated results
  const dataQuery = `
    SELECT 
      id,
      booking_id,
      wallet_id,
      amount,
      commission_amount,
      type,
      status,
      reference,
      payment_method,
      provider_fee,
      metadata,
      created_at,
      updated_at
    FROM transactions
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const result = await pool.query(dataQuery, params);

  return {
    transactions: result.rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Find a single transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object|null>} - Transaction record or null
 */
export const findTransactionById = async (transactionId) => {
  if (!transactionId) return null;

  const query = `
    SELECT 
      id,
      booking_id,
      wallet_id,
      amount,
      commission_amount,
      type,
      status,
      reference,
      payment_method,
      provider_fee,
      metadata,
      created_at,
      updated_at
    FROM transactions
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [transactionId]);
  return result.rows[0] || null;
};

/**
 * Get transaction summary for earnings
 * @param {string} walletId - Wallet ID
 * @param {string} period - Period (daily, weekly, monthly, yearly)
 * @param {Date} referenceDate - Reference date for period calculation
 * @returns {Promise<Object>} - Transaction summary
 */
export const getTransactionSummary = async (walletId, period = 'monthly', referenceDate = new Date()) => {
  if (!walletId) {
    throw new Error('walletId is required');
  }

  // Calculate period start date
  const date = new Date(referenceDate);
  let startDate;
  let previousStartDate;

  switch (period) {
    case 'daily':
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      previousStartDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
      break;
    case 'weekly':
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(date.getFullYear(), date.getMonth(), diff);
      previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - 7);
      break;
    case 'yearly':
      startDate = new Date(date.getFullYear(), 0, 1);
      previousStartDate = new Date(date.getFullYear() - 1, 0, 1);
      break;
    case 'monthly':
    default:
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      previousStartDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
      break;
  }

  // Current period summary
  const currentQuery = `
    SELECT 
      COUNT(*) as total_transactions,
      COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as total_earnings,
      COALESCE(SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END), 0) as total_payouts,
      COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0) as total_refunds,
      COALESCE(SUM(commission_amount), 0) as total_commission
    FROM transactions
    WHERE wallet_id = $1
      AND status = 'completed'
      AND created_at >= $2
  `;
  const currentResult = await pool.query(currentQuery, [walletId, startDate]);

  // Previous period summary for comparison
  const previousQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as total_earnings
    FROM transactions
    WHERE wallet_id = $1
      AND status = 'completed'
      AND created_at >= $2
      AND created_at < $3
  `;
  const previousResult = await pool.query(previousQuery, [walletId, previousStartDate, startDate]);

  // Top earning booking
  const topQuery = `
    SELECT 
      t.booking_id,
      t.amount,
      t.created_at
    FROM transactions t
    WHERE t.wallet_id = $1
      AND t.type = 'payment'
      AND t.status = 'completed'
      AND t.created_at >= $2
    ORDER BY t.amount DESC
    LIMIT 1
  `;
  const topResult = await pool.query(topQuery, [walletId, startDate]);

  const current = currentResult.rows[0];
  const previous = previousResult.rows[0];
  const topEarning = topResult.rows[0];

  // Calculate growth percentage
  const currentEarnings = parseFloat(current.total_earnings || 0);
  const previousEarnings = parseFloat(previous.total_earnings || 0);
  let growthPercentage = 0;

  if (previousEarnings > 0) {
    growthPercentage = ((currentEarnings - previousEarnings) / previousEarnings) * 100;
  } else if (currentEarnings > 0) {
    growthPercentage = 100;
  }

  return {
    period,
    start_date: startDate.toISOString(),
    end_date: new Date().toISOString(),
    total_transactions: parseInt(current.total_transactions || 0, 10),
    total_earnings: currentEarnings,
    total_payouts: parseFloat(current.total_payouts || 0),
    total_refunds: parseFloat(current.total_refunds || 0),
    total_commission: parseFloat(current.total_commission || 0),
    net_earnings: currentEarnings - parseFloat(current.total_commission || 0),
    growth_percentage: parseFloat(growthPercentage.toFixed(2)),
    top_earning: topEarning ? {
      booking_id: topEarning.booking_id,
      amount: parseFloat(topEarning.amount),
      date: topEarning.created_at
    } : null
  };
};

// ================================================================
// WITHDRAWAL OPERATIONS
// PRD Section 11.8 - Withdrawal requests
// ================================================================

/**
 * Create a withdrawal request
 * @param {Object} data - Withdrawal request data
 * @param {string} data.hostId - Host user ID
 * @param {number} data.amount - Withdrawal amount
 * @param {string} data.bankCode - Bank code
 * @param {string} data.accountNumber - Bank account number
 * @param {string} data.accountName - Bank account holder name
 * @param {string} data.reference - Unique withdrawal reference
 * @returns {Promise<Object>} - Created withdrawal request
 */
export const createWithdrawalRequest = async (data) => {
  const {
    hostId,
    amount,
    bankCode,
    accountNumber,
    accountName,
    reference
  } = data;

  if (!hostId) {
    throw new Error('hostId is required');
  }

  if (!amount || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  if (!bankCode) {
    throw new Error('Bank code is required');
  }

  if (!accountNumber) {
    throw new Error('Account number is required');
  }

  if (!accountName) {
    throw new Error('Account name is required');
  }

  if (!reference) {
    throw new Error('Reference is required');
  }

  const query = `
    INSERT INTO withdrawal_requests (
      host_id,
      amount,
      bank_code,
      account_number,
      account_name,
      status,
      reference,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING 
      id,
      host_id,
      amount,
      bank_code,
      account_number,
      account_name,
      status,
      reference,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [
    hostId,
    amount,
    bankCode,
    accountNumber,
    accountName,
    WITHDRAWAL_STATUS.PENDING,
    reference
  ]);

  return result.rows[0];
};

/**
 * Find withdrawal requests with filters
 * @param {string} hostId - Host user ID
 * @param {Object} filters - Filter options
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Items per page
 * @param {string} filters.status - Withdrawal status filter
 * @param {string} filters.startDate - Start date filter
 * @param {string} filters.endDate - End date filter
 * @returns {Promise<Object>} - Withdrawal requests and metadata
 */
export const findWithdrawalRequests = async (hostId, filters = {}) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  const {
    page = 1,
    limit = 10,
    status,
    startDate,
    endDate
  } = filters;

  const offset = (page - 1) * limit;
  const conditions = ['host_id = $1'];
  const params = [hostId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (startDate) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM withdrawal_requests
    WHERE ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated results
  const dataQuery = `
    SELECT 
      id,
      host_id,
      amount,
      bank_code,
      account_number,
      account_name,
      status,
      reference,
      processed_at,
      created_at,
      updated_at
    FROM withdrawal_requests
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const result = await pool.query(dataQuery, params);

  return {
    withdrawals: result.rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Update withdrawal request status
 * @param {string} withdrawalId - Withdrawal request ID
 * @param {string} status - New status
 * @param {Object} options - Additional options
 * @param {string} options.reason - Failure reason (if failed)
 * @returns {Promise<Object>} - Updated withdrawal request
 */
export const updateWithdrawalStatus = async (withdrawalId, status, options = {}) => {
  if (!withdrawalId) {
    throw new Error('withdrawalId is required');
  }

  if (!status) {
    throw new Error('Status is required');
  }

  const { reason } = options;
  const processedAt = status === WITHDRAWAL_STATUS.COMPLETED || 
                      status === WITHDRAWAL_STATUS.FAILED ? 'NOW()' : null;

  let query = `
    UPDATE withdrawal_requests
    SET 
      status = $1,
      updated_at = NOW()
  `;

  const params = [status, withdrawalId];

  if (processedAt) {
    query += `, processed_at = ${processedAt}`;
  }

  if (reason && status === WITHDRAWAL_STATUS.FAILED) {
    query += `, failure_reason = $${params.length + 1}`;
    params.push(reason);
  }

  query += `
    WHERE id = $${params.length - 1}
    RETURNING 
      id,
      host_id,
      amount,
      bank_code,
      account_number,
      account_name,
      status,
      reference,
      processed_at,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    throw new Error('Withdrawal request not found');
  }

  return result.rows[0];
};

/**
 * Get all pending withdrawals (Admin only)
 * @param {Object} options - Options
 * @param {number} options.limit - Limit results
 * @returns {Promise<Array>} - Pending withdrawal requests
 */
export const getPendingWithdrawals = async (options = {}) => {
  const { limit = 100 } = options;

  const query = `
    SELECT 
      wr.id,
      wr.host_id,
      u.full_name as host_name,
      u.email as host_email,
      wr.amount,
      wr.bank_code,
      wr.account_number,
      wr.account_name,
      wr.status,
      wr.reference,
      wr.created_at,
      (SELECT balance FROM wallets WHERE host_id = wr.host_id) as current_balance
    FROM withdrawal_requests wr
    JOIN users u ON wr.host_id = u.id
    WHERE wr.status = $1
    ORDER BY wr.created_at ASC
    LIMIT $2
  `;

  const result = await pool.query(query, [WITHDRAWAL_STATUS.PENDING, limit]);
  return result.rows;
};

/**
 * Get withdrawal limits for a host
 * @param {string} hostId - Host user ID
 * @returns {Promise<Object>} - Withdrawal limits and usage
 */
export const getWithdrawalLimits = async (hostId) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  // Get or create withdrawal limits record
  const query = `
    INSERT INTO withdrawal_limits (host_id, daily_reset_at, weekly_reset_at)
    VALUES ($1, NOW(), NOW())
    ON CONFLICT (host_id) DO UPDATE SET host_id = EXCLUDED.host_id
    RETURNING 
      id,
      host_id,
      daily_limit,
      weekly_limit,
      daily_used,
      weekly_used,
      daily_reset_at,
      weekly_reset_at,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [hostId]);
  const limits = result.rows[0];

  // Check if limits need reset
  const now = new Date();
  let dailyUsed = parseFloat(limits.daily_used || 0);
  let weeklyUsed = parseFloat(limits.weekly_used || 0);

  // Reset daily if needed
  const dailyReset = new Date(limits.daily_reset_at);
  if (now.getDate() !== dailyReset.getDate() || 
      now.getMonth() !== dailyReset.getMonth() || 
      now.getFullYear() !== dailyReset.getFullYear()) {
    dailyUsed = 0;
    await pool.query(
      `UPDATE withdrawal_limits 
       SET daily_used = 0, daily_reset_at = NOW() 
       WHERE host_id = $1`,
      [hostId]
    );
  }

  // Reset weekly if needed
  const weeklyReset = new Date(limits.weekly_reset_at);
  const weekDiff = Math.floor((now - weeklyReset) / (7 * 24 * 60 * 60 * 1000));
  if (weekDiff >= 1) {
    weeklyUsed = 0;
    await pool.query(
      `UPDATE withdrawal_limits 
       SET weekly_used = 0, weekly_reset_at = NOW() 
       WHERE host_id = $1`,
      [hostId]
    );
  }

  return {
    daily_limit: parseFloat(limits.daily_limit),
    weekly_limit: parseFloat(limits.weekly_limit),
    daily_used: dailyUsed,
    weekly_used: weeklyUsed,
    daily_remaining: parseFloat(limits.daily_limit) - dailyUsed,
    weekly_remaining: parseFloat(limits.weekly_limit) - weeklyUsed,
    daily_reset_at: limits.daily_reset_at,
    weekly_reset_at: limits.weekly_reset_at
  };
};

/**
 * Update withdrawal usage (called when withdrawal is requested)
 * @param {string} hostId - Host user ID
 * @param {number} amount - Withdrawal amount
 * @returns {Promise<void>}
 */
export const updateWithdrawalUsage = async (hostId, amount) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  if (!amount || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const query = `
    UPDATE withdrawal_limits
    SET 
      daily_used = daily_used + $1,
      weekly_used = weekly_used + $1,
      updated_at = NOW()
    WHERE host_id = $2
  `;

  await pool.query(query, [amount, hostId]);
};

// ================================================================
// PAYOUT OPERATIONS
// PRD Section 10.8 - 24-hour hold period
// ================================================================

/**
 * Create a payout schedule record (24-hour hold)
 * @param {Object} data - Payout schedule data
 * @param {string} data.hostId - Host user ID
 * @param {string} data.bookingId - Booking ID
 * @param {number} data.amount - Payout amount
 * @param {number} data.holdHours - Hold period in hours (default: 24)
 * @returns {Promise<Object>} - Created payout schedule
 */
export const createPayoutSchedule = async (data) => {
  const {
    hostId,
    bookingId,
    amount,
    holdHours = 24
  } = data;

  if (!hostId) {
    throw new Error('hostId is required');
  }

  if (!bookingId) {
    throw new Error('bookingId is required');
  }

  if (!amount || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const query = `
    INSERT INTO payout_schedules (
      host_id,
      booking_id,
      amount,
      status,
      scheduled_date,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${holdHours} hours', NOW(), NOW())
    RETURNING 
      id,
      host_id,
      booking_id,
      amount,
      status,
      scheduled_date,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [
    hostId,
    bookingId,
    amount,
    PAYOUT_SCHEDULE_STATUS.PENDING
  ]);

  return result.rows[0];
};

/**
 * Get pending payouts for scheduler processing
 * @param {Object} options - Options
 * @param {number} options.limit - Limit results
 * @param {string} options.status - Status filter
 * @returns {Promise<Array>} - Pending payouts
 */
export const getPendingPayouts = async (options = {}) => {
  const { limit = 50, status = 'pending' } = options;

  const query = `
    SELECT 
      ps.id,
      ps.host_id,
      ps.booking_id,
      ps.amount,
      ps.status,
      ps.scheduled_date,
      ps.created_at,
      u.full_name as host_name,
      u.email as host_email,
      w.title as workspace_title
    FROM payout_schedules ps
    JOIN users u ON ps.host_id = u.id
    LEFT JOIN bookings b ON ps.booking_id = b.id
    LEFT JOIN workspaces w ON b.workspace_id = w.id
    WHERE ps.status = $1
      AND ps.scheduled_date <= NOW()
    ORDER BY ps.scheduled_date ASC
    LIMIT $2
  `;

  const result = await pool.query(query, [status, limit]);
  return result.rows;
};

/**
 * Mark a payout as completed
 * @param {string} payoutId - Payout schedule ID
 * @returns {Promise<Object>} - Updated payout schedule
 */
export const markPayoutCompleted = async (payoutId) => {
  if (!payoutId) {
    throw new Error('payoutId is required');
  }

  const query = `
    UPDATE payout_schedules
    SET 
      status = $1,
      completed_date = NOW(),
      updated_at = NOW()
    WHERE id = $2
    RETURNING 
      id,
      host_id,
      booking_id,
      amount,
      status,
      scheduled_date,
      completed_date,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [PAYOUT_SCHEDULE_STATUS.COMPLETED, payoutId]);

  if (result.rows.length === 0) {
    throw new Error('Payout schedule not found');
  }

  return result.rows[0];
};

/**
 * Mark a payout as failed
 * @param {string} payoutId - Payout schedule ID
 * @param {string} reason - Failure reason
 * @returns {Promise<Object>} - Updated payout schedule
 */
export const markPayoutFailed = async (payoutId, reason) => {
  if (!payoutId) {
    throw new Error('payoutId is required');
  }

  const query = `
    UPDATE payout_schedules
    SET 
      status = $1,
      failed_reason = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING 
      id,
      host_id,
      booking_id,
      amount,
      status,
      scheduled_date,
      completed_date,
      failed_reason,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [
    PAYOUT_SCHEDULE_STATUS.FAILED,
    reason,
    payoutId
  ]);

  if (result.rows.length === 0) {
    throw new Error('Payout schedule not found');
  }

  return result.rows[0];
};

/**
 * Get payout schedule for a host
 * @param {string} hostId - Host user ID
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Status filter
 * @param {number} filters.limit - Limit results
 * @param {number} filters.offset - Offset for pagination
 * @returns {Promise<Object>} - Payout schedule and summary
 */
export const getPayoutSchedule = async (hostId, filters = {}) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  const {
    status,
    limit = 10,
    offset = 0
  } = filters;

  const conditions = ['ps.host_id = $1'];
  const params = [hostId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`ps.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get payout records
  const query = `
    SELECT 
      ps.id,
      ps.host_id,
      ps.booking_id,
      ps.amount,
      ps.status,
      ps.scheduled_date,
      ps.completed_date,
      ps.failed_reason,
      ps.created_at,
      ps.updated_at,
      w.title as workspace_title
    FROM payout_schedules ps
    LEFT JOIN bookings b ON ps.booking_id = b.id
    LEFT JOIN workspaces w ON b.workspace_id = w.id
    WHERE ${whereClause}
    ORDER BY ps.scheduled_date ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const result = await pool.query(query, params);

  // Get summary
  const summaryQuery = `
    SELECT 
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
      COALESCE(SUM(CASE WHEN status = 'ready' THEN amount ELSE 0 END), 0) as total_ready,
      COALESCE(SUM(CASE WHEN status = 'processing' THEN amount ELSE 0 END), 0) as total_processing,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_completed,
      COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) as total_failed
    FROM payout_schedules
    WHERE host_id = $1
  `;

  const summaryResult = await pool.query(summaryQuery, [hostId]);
  const summary = summaryResult.rows[0];

  // Calculate hold period remaining for pending payouts
  const now = new Date();
  const payoutsWithRemaining = result.rows.map(payout => {
    const scheduledDate = new Date(payout.scheduled_date);
    const remainingMs = scheduledDate - now;
    const remainingHours = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));
    
    return {
      ...payout,
      hold_period_remaining: remainingHours > 0 ? `${remainingHours} hours` : 'Ready for processing'
    };
  });

  return {
    schedule: payoutsWithRemaining,
    summary: {
      total: parseInt(summary.total || 0, 10),
      pending: parseFloat(summary.total_pending || 0),
      ready: parseFloat(summary.total_ready || 0),
      processing: parseFloat(summary.total_processing || 0),
      completed: parseFloat(summary.total_completed || 0),
      failed: parseFloat(summary.total_failed || 0)
    }
  };
};

/**
 * Get total pending payout amount for a host
 * @param {string} hostId - Host user ID
 * @returns {Promise<number>} - Total pending amount
 */
export const getTotalPendingPayouts = async (hostId) => {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  const query = `
    SELECT COALESCE(SUM(amount), 0) as total_pending
    FROM payout_schedules
    WHERE host_id = $1
      AND status IN ('pending', 'ready', 'processing')
  `;

  const result = await pool.query(query, [hostId]);
  return parseFloat(result.rows[0].total_pending || 0);
};

// ================================================================
// EXPORTS
// ================================================================

export default {
  // Wallet Operations
  findWalletByHostId,
  createWallet,
  updateWalletBalance,
  getWalletWithLock,
  
  // Transaction Operations
  createTransaction,
  findTransactionsByWallet,
  findTransactionById,
  getTransactionSummary,
  
  // Withdrawal Operations
  createWithdrawalRequest,
  findWithdrawalRequests,
  updateWithdrawalStatus,
  getPendingWithdrawals,
  getWithdrawalLimits,
  updateWithdrawalUsage,
  
  // Payout Operations
  createPayoutSchedule,
  getPendingPayouts,
  markPayoutCompleted,
  markPayoutFailed,
  getPayoutSchedule,
  getTotalPendingPayouts
};