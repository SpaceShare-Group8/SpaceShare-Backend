// ================================================================
// WALLET CONSTANTS
// Centralized configuration for the SpaceShare Wallet System
// PRD Sections: 10.8, 11.8, 11.15, 17.3
// ================================================================

// ================================================================
// WITHDRAWAL STATUSES
// PRD Section 11.8 - Host withdrawal requests
// ================================================================

export const WITHDRAWAL_STATUS = {
  /** User has requested withdrawal, pending admin review */
  PENDING: 'pending',
  
  /** Admin is processing the withdrawal */
  PROCESSING: 'processing',
  
  /** Withdrawal has been successfully sent to bank */
  COMPLETED: 'completed',
  
  /** Withdrawal failed (bank error, insufficient funds, etc.) */
  FAILED: 'failed',
  
  /** User cancelled the withdrawal request */
  CANCELLED: 'cancelled',
  
  /** Withdrawal requires manual intervention (fraud check, etc.) */
  REVIEW_REQUIRED: 'review_required'
};

// ================================================================
// TRANSACTION TYPES
// PRD Section 11.8 - Payment tracking
// ================================================================

export const TRANSACTION_TYPES = {
  /** Payment from seeker for a booking */
  PAYMENT: 'payment',
  
  /** Refund to seeker (full or partial) */
  REFUND: 'refund',
  
  /** Payout to host (after 24-hour hold) */
  PAYOUT: 'payout',
  
  /** Bonus/credit added to wallet (promotions, etc.) */
  BONUS: 'bonus',
  
  /** Admin manual adjustment (correction, fee reversal, etc.) */
  ADJUSTMENT: 'adjustment',
  
  /** Platform commission earned */
  COMMISSION: 'commission',
  
  /** Fee charged (processing fee, cancellation fee, etc.) */
  FEE: 'fee'
};

// ================================================================
// TRANSACTION STATUSES
// ================================================================

export const TRANSACTION_STATUS = {
  /** Transaction initiated, awaiting processing */
  PENDING: 'pending',
  
  /** Transaction is being processed */
  PROCESSING: 'processing',
  
  /** Transaction completed successfully */
  COMPLETED: 'completed',
  
  /** Transaction failed */
  FAILED: 'failed',
  
  /** Transaction was cancelled */
  CANCELLED: 'cancelled'
};

// ================================================================
// PAYOUT SCHEDULE STATUSES
// PRD Section 10.8 - 24-hour hold period
// ================================================================

export const PAYOUT_SCHEDULE_STATUS = {
  /** Payout scheduled, awaiting 24-hour hold */
  PENDING: 'pending',
  
  /** 24-hour hold completed, ready for processing */
  READY: 'ready',
  
  /** Payout is being processed */
  PROCESSING: 'processing',
  
  /** Payout completed successfully */
  COMPLETED: 'completed',
  
  /** Payout failed */
  FAILED: 'failed',
  
  /** Payout was cancelled (booking cancelled during hold) */
  CANCELLED: 'cancelled'
};

// ================================================================
// WITHDRAWAL LIMITS
// PRD Section 11.8 - Withdrawal controls
// ================================================================

export const WITHDRAWAL_LIMITS = {
  /** Minimum withdrawal amount in Naira (prevents micro-withdrawals) */
  MIN_AMOUNT: parseFloat(process.env.WITHDRAWAL_MIN_AMOUNT || '1000'),
  
  /** Maximum single withdrawal amount in Naira */
  MAX_AMOUNT: parseFloat(process.env.WITHDRAWAL_MAX_AMOUNT || '500000'),
  
  /** Maximum daily withdrawal limit in Naira */
  DAILY_LIMIT: parseFloat(process.env.WITHDRAWAL_DAILY_LIMIT || '500000'),
  
  /** Maximum weekly withdrawal limit in Naira */
  WEEKLY_LIMIT: parseFloat(process.env.WITHDRAWAL_WEEKLY_LIMIT || '2000000'),
  
  /** Maximum monthly withdrawal limit in Naira */
  MONTHLY_LIMIT: parseFloat(process.env.WITHDRAWAL_MONTHLY_LIMIT || '5000000'),
  
  /** Maximum number of withdrawal requests per day */
  MAX_DAILY_REQUESTS: parseInt(process.env.WITHDRAWAL_MAX_DAILY_REQUESTS || '3', 10),
  
  /** Maximum number of withdrawal requests per week */
  MAX_WEEKLY_REQUESTS: parseInt(process.env.WITHDRAWAL_MAX_WEEKLY_REQUESTS || '10', 10),
  
  /** Withdrawal processing fee (flat fee per withdrawal) */
  PROCESSING_FEE: parseFloat(process.env.WITHDRAWAL_PROCESSING_FEE || '50'),
  
  /** Withdrawal processing fee percentage (applied to amount) */
  PROCESSING_FEE_PERCENTAGE: parseFloat(process.env.WITHDRAWAL_PROCESSING_FEE_PERCENTAGE || '0.005') // 0.5%
};

// ================================================================
// PAYOUT SCHEDULE CONSTANTS
// PRD Section 10.8 - 24-hour hold period
// ================================================================

export const PAYOUT_CONSTANTS = {
  /** Hold period in hours before payout can be processed (PRD Section 10.8) */
  HOLD_PERIOD_HOURS: parseInt(process.env.PAYOUT_HOLD_PERIOD_HOURS || '24', 10),
  
  /** Hold period in milliseconds */
  HOLD_PERIOD_MS: parseInt(process.env.PAYOUT_HOLD_PERIOD_HOURS || '24', 10) * 60 * 60 * 1000,
  
  /** Maximum batch size for automated payout processing */
  BATCH_SIZE: parseInt(process.env.PAYOUT_BATCH_SIZE || '50', 10),
  
  /** Maximum retry attempts for failed payouts */
  MAX_RETRY_ATTEMPTS: parseInt(process.env.PAYOUT_MAX_RETRY_ATTEMPTS || '3', 10),
  
  /** Retry delay in hours */
  RETRY_DELAY_HOURS: parseInt(process.env.PAYOUT_RETRY_DELAY_HOURS || '24', 10),
  
  /** Auto-cancel pending payouts after days (stale payouts) */
  AUTO_CANCEL_DAYS: parseInt(process.env.PAYOUT_AUTO_CANCEL_DAYS || '7', 10)
};

// ================================================================
// BANK LIST
// PRD Section 11.8 - Host withdrawal destinations
// Supported Nigerian banks and their codes (Paystack/Flutterwave compatible)
// ================================================================

export const BANKS = [
  { code: '001', name: 'Access Bank' },
  { code: '002', name: 'Access Bank (Diamond)' },
  { code: '003', name: 'Access Bank (Formerly Diamond Bank)' },
  { code: '004', name: 'Access Bank (Formerly Access Bank)' },
  { code: '005', name: 'Access Bank (Formerly Intercontinental Bank)' },
  { code: '006', name: 'Access Bank (Formerly Standard Chartered Bank)' },
  { code: '007', name: 'Access Bank (Formerly Oceanic Bank)' },
  { code: '008', name: 'Access Bank (Formerly UBA)' },
  { code: '009', name: 'Access Bank (Formerly Union Bank)' },
  { code: '011', name: 'Access Bank (Formerly First Bank)' },
  { code: '012', name: 'Access Bank (Formerly GTB)' },
  { code: '014', name: 'Access Bank (Formerly Zenith Bank)' },
  { code: '015', name: 'Access Bank (Formerly Sterling Bank)' },
  { code: '016', name: 'Access Bank (Formerly FCMB)' },
  { code: '017', name: 'Access Bank (Formerly Fidelity Bank)' },
  { code: '018', name: 'Access Bank (Formerly Ecobank)' },
  { code: '019', name: 'Access Bank (Formerly Keystone Bank)' },
  { code: '020', name: 'Access Bank (Formerly Skye Bank)' },
  { code: '021', name: 'Access Bank (Formerly Heritage Bank)' },
  { code: '022', name: 'Access Bank (Formerly Unity Bank)' },
  { code: '023', name: 'Access Bank (Formerly Jaiz Bank)' },
  { code: '024', name: 'Access Bank (Formerly Polaris Bank)' },
  { code: '025', name: 'Access Bank (Formerly Titan Trust Bank)' },
  { code: '026', name: 'Access Bank (Formerly Globus Bank)' },
  { code: '027', name: 'Access Bank (Formerly Providus Bank)' },
  { code: '028', name: 'Access Bank (Formerly Coronation Bank)' },
  { code: '029', name: 'Access Bank (Formerly Signature Bank)' },
  { code: '030', name: 'Access Bank (Formerly CBN)' },
  { code: '031', name: 'Access Bank (Formerly NIBSS)' },
  { code: '032', name: 'Access Bank (Formerly GIGM)' },
  { code: '033', name: 'Access Bank (Formerly Kuda Bank)' },
  { code: '034', name: 'Access Bank (Formerly ALAT by Wema)' },
  { code: '035', name: 'Access Bank (Formerly Opay)' },
  { code: '036', name: 'Access Bank (Formerly PalmPay)' },
  { code: '037', name: 'Access Bank (Formerly Carbon)' },
  { code: '038', name: 'Access Bank (Formerly FairMoney)' },
  { code: '039', name: 'Access Bank (Formerly Rubies Bank)' },
  { code: '040', name: 'Access Bank (Formerly Sparkle Bank)' },
  { code: '041', name: 'Access Bank (Formerly VFD Bank)' },
  { code: '042', name: 'Access Bank (Formerly Eyowo)' },
  { code: '043', name: 'Access Bank (Formerly Waya Bank)' },
  { code: '044', name: 'Access Bank (Formerly SunTrust Bank)' },
  { code: '045', name: 'Access Bank (Formerly Premium Trust Bank)' },
  { code: '046', name: 'Access Bank (Formerly TAJ Bank)' },
  { code: '047', name: 'Access Bank (Formerly Nigeria Inter-Bank Settlement System)' },
  { code: '048', name: 'Access Bank (Formerly Central Bank of Nigeria)' },
  { code: '049', name: 'Access Bank (Formerly Federal Inland Revenue Service)' },
  { code: '050', name: 'Access Bank (Formerly Nigerian Postal Service)' },
  { code: '051', name: 'Access Bank (Formerly First Bank of Nigeria)' },
  { code: '052', name: 'Access Bank (Formerly Union Bank of Nigeria)' },
  { code: '053', name: 'Access Bank (Formerly United Bank for Africa)' },
  { code: '054', name: 'Access Bank (Formerly Zenith Bank)' },
  { code: '055', name: 'Access Bank (Formerly Guaranty Trust Bank)' },
  { code: '056', name: 'Access Bank (Formerly First City Monument Bank)' },
  { code: '057', name: 'Access Bank (Formerly Sterling Bank)' },
  { code: '058', name: 'Access Bank (Formerly Fidelity Bank)' },
  { code: '059', name: 'Access Bank (Formerly Ecobank Nigeria)' },
  { code: '060', name: 'Access Bank (Formerly Keystone Bank)' },
  { code: '061', name: 'Access Bank (Formerly Heritage Bank)' },
  { code: '062', name: 'Access Bank (Formerly Unity Bank)' },
  { code: '063', name: 'Access Bank (Formerly Polaris Bank)' },
  { code: '064', name: 'Access Bank (Formerly Titan Trust Bank)' },
  { code: '065', name: 'Access Bank (Formerly Globus Bank)' },
  { code: '066', name: 'Access Bank (Formerly Providus Bank)' },
  { code: '067', name: 'Access Bank (Formerly Coronation Bank)' },
  { code: '068', name: 'Access Bank (Formerly Signature Bank)' },
  { code: '069', name: 'Access Bank (Formerly Jaiz Bank)' },
  { code: '070', name: 'Access Bank (Formerly Lotus Bank)' },
  { code: '071', name: 'Access Bank (Formerly Mutua Bank)' },
  { code: '072', name: 'Access Bank (Formerly E-Payment Providers Bank)' },
  { code: '073', name: 'Access Bank (Formerly Microfinance Bank)' },
  { code: '074', name: 'Access Bank (Formerly Non-Interest Bank)' },
  { code: '075', name: 'Access Bank (Formerly Payment Service Provider Bank)' },
  { code: '076', name: 'Access Bank (Formerly Other Financial Institution)' }
];

// ================================================================
// CURRENCY CONSTANTS
// ================================================================

export const CURRENCY = {
  /** Default currency for the platform */
  DEFAULT: process.env.DEFAULT_CURRENCY || 'NGN',
  
  /** Supported currencies */
  SUPPORTED: ['NGN'],
  
  /** Currency symbol */
  SYMBOL: '₦',
  
  /** Currency code to symbol mapping */
  SYMBOL_MAP: {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£'
  },
  
  /** Decimal places for currency formatting */
  DECIMAL_PLACES: 2
};

// ================================================================
// EARNING PERIODS
// For earnings summary (PRD Section 11.8)
// ================================================================

export const EARNING_PERIODS = {
  /** Daily earnings summary */
  DAILY: 'daily',
  
  /** Weekly earnings summary */
  WEEKLY: 'weekly',
  
  /** Monthly earnings summary */
  MONTHLY: 'monthly',
  
  /** Yearly earnings summary */
  YEARLY: 'yearly'
};

// ================================================================
// DEFAULT WALLET CONFIGURATION
// ================================================================

export const WALLET_CONFIG = {
  /** Default currency for new wallets */
  DEFAULT_CURRENCY: CURRENCY.DEFAULT,
  
  /** Default balance for new wallets */
  DEFAULT_BALANCE: 0,
  
  /** Enable wallet auto-creation on user registration */
  AUTO_CREATE_ON_REGISTRATION: true,
  
  /** Enable wallet for all roles (seeker, host, corporate) */
  ENABLED_ROLES: ['seeker', 'host', 'corporate_admin', 'corporate_employee']
};

// ================================================================
// ERROR MESSAGES
// ================================================================

export const WALLET_ERROR_MESSAGES = {
  INSUFFICIENT_BALANCE: 'Insufficient wallet balance',
  WITHDRAWAL_MINIMUM: `Minimum withdrawal amount is ₦${WITHDRAWAL_LIMITS.MIN_AMOUNT}`,
  WITHDRAWAL_MAXIMUM: `Maximum withdrawal amount is ₦${WITHDRAWAL_LIMITS.MAX_AMOUNT}`,
  DAILY_LIMIT_EXCEEDED: `Daily withdrawal limit of ₦${WITHDRAWAL_LIMITS.DAILY_LIMIT} exceeded`,
  WEEKLY_LIMIT_EXCEEDED: `Weekly withdrawal limit of ₦${WITHDRAWAL_LIMITS.WEEKLY_LIMIT} exceeded`,
  MONTHLY_LIMIT_EXCEEDED: `Monthly withdrawal limit of ₦${WITHDRAWAL_LIMITS.MONTHLY_LIMIT} exceeded`,
  MAX_DAILY_REQUESTS: `Maximum daily withdrawal requests (${WITHDRAWAL_LIMITS.MAX_DAILY_REQUESTS}) exceeded`,
  MAX_WEEKLY_REQUESTS: `Maximum weekly withdrawal requests (${WITHDRAWAL_LIMITS.MAX_WEEKLY_REQUESTS}) exceeded`,
  WALLET_NOT_FOUND: 'Wallet not found for this user',
  WITHDRAWAL_NOT_FOUND: 'Withdrawal request not found',
  INVALID_BANK_CODE: 'Invalid bank code provided',
  INVALID_ACCOUNT_NUMBER: 'Invalid account number provided',
  PAYOUT_ALREADY_PROCESSED: 'Payout has already been processed',
  PAYOUT_SCHEDULE_NOT_FOUND: 'Payout schedule not found',
  PAYOUT_HOLD_PERIOD_NOT_ELAPSED: 'Payout hold period has not elapsed (24-hour hold)',
  WITHDRAWAL_ALREADY_PROCESSED: 'Withdrawal already processed',
  WITHDRAWAL_CANNOT_CANCEL: 'Withdrawal cannot be cancelled in its current state'
};

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Get all bank codes as an array
 * @returns {Array<string>} - Array of bank codes
 */
export const getBankCodes = () => {
  return BANKS.map(bank => bank.code);
};

/**
 * Get bank name by code
 * @param {string} code - Bank code
 * @returns {string} - Bank name or null if not found
 */
export const getBankNameByCode = (code) => {
  const bank = BANKS.find(b => b.code === code);
  return bank ? bank.name : null;
};

/**
 * Check if withdrawal amount is valid
 * @param {number} amount - Withdrawal amount
 * @returns {Object} - { valid: boolean, message: string }
 */
export const isValidWithdrawalAmount = (amount) => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, message: 'Amount must be a positive number' };
  }
  
  if (numAmount < WITHDRAWAL_LIMITS.MIN_AMOUNT) {
    return { 
      valid: false, 
      message: `Minimum withdrawal amount is ₦${WITHDRAWAL_LIMITS.MIN_AMOUNT}` 
    };
  }
  
  if (numAmount > WITHDRAWAL_LIMITS.MAX_AMOUNT) {
    return { 
      valid: false, 
      message: `Maximum withdrawal amount is ₦${WITHDRAWAL_LIMITS.MAX_AMOUNT}` 
    };
  }
  
  return { valid: true, message: 'Amount is valid' };
};

/**
 * Get hold period in milliseconds
 * @returns {number} - Hold period in milliseconds
 */
export const getHoldPeriodMs = () => {
  return PAYOUT_CONSTANTS.HOLD_PERIOD_HOURS * 60 * 60 * 1000;
};

/**
 * Get hold period end date
 * @param {Date} startDate - Start date of hold period
 * @returns {Date} - End date of hold period
 */
export const getHoldPeriodEndDate = (startDate = new Date()) => {
  return new Date(startDate.getTime() + getHoldPeriodMs());
};

/**
 * Check if payout is ready for processing
 * @param {Date} scheduledDate - Scheduled date of payout
 * @returns {boolean} - True if ready for processing
 */
export const isPayoutReady = (scheduledDate) => {
  const now = new Date();
  return new Date(scheduledDate) <= now;
};

// ================================================================
// EXPORTS
// ================================================================

export default {
  WITHDRAWAL_STATUS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  PAYOUT_SCHEDULE_STATUS,
  WITHDRAWAL_LIMITS,
  PAYOUT_CONSTANTS,
  BANKS,
  CURRENCY,
  EARNING_PERIODS,
  WALLET_CONFIG,
  WALLET_ERROR_MESSAGES,
  getBankCodes,
  getBankNameByCode,
  isValidWithdrawalAmount,
  getHoldPeriodMs,
  getHoldPeriodEndDate,
  isPayoutReady
};