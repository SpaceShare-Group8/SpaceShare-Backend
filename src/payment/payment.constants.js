// ================================================================
// PAYMENT CONSTANTS
// Configuration for Paystack/Flutterwave integration
// ================================================================

// Supported payment providers
export const PAYMENT_PROVIDERS = {
  PAYSTACK: 'paystack',
  FLUTTERWAVE: 'flutterwave'
};

// Default provider (can be changed via env)
export const DEFAULT_PROVIDER = process.env.PAYMENT_PROVIDER || PAYMENT_PROVIDERS.PAYSTACK;

// Platform commission rate (10-15% as per PRD Section 10.8)
export const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10');

// Payment statuses
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded'
};

// Booking statuses triggered by payment
export const BOOKING_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  PAYMENT_FAILED: 'payment_failed'
};

// Currency
export const CURRENCY = process.env.PAYMENT_CURRENCY || 'NGN';

// ================================================================
// PAYMENT PROVIDER CONFIGURATION
// ================================================================

// Paystack configuration
export const PAYSTACK_CONFIG = {
  secretKey: process.env.PAYSTACK_SECRET_KEY || 'test_secret_key',
  publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'test_public_key',
  baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
  callbackUrl: process.env.PAYSTACK_CALLBACK_URL || 'http://localhost:5000/api/payments/callback',
  webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || 'webhook_secret'
};

// Flutterwave configuration
export const FLUTTERWAVE_CONFIG = {
  publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || 'test_public_key',
  secretKey: process.env.FLUTTERWAVE_SECRET_KEY || 'test_secret_key',
  encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY || 'test_encryption_key',
  baseUrl: process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3',
  callbackUrl: process.env.FLUTTERWAVE_CALLBACK_URL || 'http://localhost:5000/api/payments/callback',
  webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET || 'webhook_secret'
};

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Get provider configuration based on provider name
 * @param {string} provider - 'paystack' or 'flutterwave'
 * @returns {object} Provider configuration
 */
export const getProviderConfig = (provider = DEFAULT_PROVIDER) => {
  if (provider === PAYMENT_PROVIDERS.PAYSTACK) {
    return PAYSTACK_CONFIG;
  }
  if (provider === PAYMENT_PROVIDERS.FLUTTERWAVE) {
    return FLUTTERWAVE_CONFIG;
  }
  throw new Error(`Unsupported payment provider: ${provider}`);
};

/**
 * Calculate platform commission
 * @param {number} amount - Total booking amount
 * @param {number} rate - Commission rate (default: 10%)
 * @returns {object} { commission, netAmount }
 */
export const calculateCommission = (amount, rate = PLATFORM_COMMISSION_RATE) => {
  const commission = parseFloat((amount * rate).toFixed(2));
  const netAmount = parseFloat((amount - commission).toFixed(2));
  return { commission, netAmount };
};