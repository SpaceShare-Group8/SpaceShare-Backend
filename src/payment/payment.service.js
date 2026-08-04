// ================================================================
// PAYMENT SERVICE
// Core payment logic: Initialize, verify, webhook handling, refunds
// PRD Section 11.8 - Payments
// ================================================================

import axios from "axios";
import crypto from "crypto";
import pool from "../common/config/db.js";
import { sendEmail } from "../notification/notification.service.js";
import {
  PAYMENT_PROVIDERS,
  DEFAULT_PROVIDER,
  PAYMENT_STATUS,
  BOOKING_STATUS,
  CURRENCY,
  calculateCommission,
  getProviderConfig,
} from "./payment.constants.js";

// ✅ Import wallet service for payout scheduling (PRD Section 10.8, 11.8)
import { scheduleHostPayout } from "../wallet/wallet.service.js";

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Create a notification record (PRD Section 10.9)
 */
const createNotification = async (
  userId,
  type,
  title,
  message,
  metadata = {},
) => {
  const query = `
    INSERT INTO notifications (user_id, type, title, message, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id
  `;
  const result = await pool.query(query, [
    userId,
    type,
    title,
    message,
    JSON.stringify(metadata),
  ]);
  const userResult = await pool.query(`SELECT email FROM users WHERE id = $1`, [
    userId,
  ]);
  if (userResult.rows.length > 0) {
    try {
      await sendEmail(userResult.rows[0].email, title, message);
    } catch (err) {
      console.error("Email failed:", err.message);
    }
  }
  return result.rows[0];
};

/**
 * Calculate partial refund amount based on cancellation timing (PRD Section 17.3)
 */
const calculatePartialRefund = async (bookingId) => {
  const bookingQuery = `
    SELECT start_time, total_amount, status
    FROM bookings
    WHERE id = $1
  `;
  const result = await pool.query(bookingQuery, [bookingId]);

  if (result.rows.length === 0) {
    throw new Error("Booking not found");
  }

  const booking = result.rows[0];
  const now = new Date();
  const startTime = new Date(booking.start_time);
  const hoursUntilStart = (startTime - now) / (1000 * 60 * 60);

  // PRD Section 17.3: Cancellation policy
  // - 2+ hours before: full refund minus 10% processing fee
  // - Less than 2 hours: no refund
  // - No-show: no refund

  if (hoursUntilStart >= 2) {
    // Full refund minus 10% processing fee
    return parseFloat(booking.total_amount) * 0.9;
  }

  return 0; // No refund for late cancellation
};

/**
 * Create review request for reliability rating (PRD Section 10.3)
 */
const createReviewRequest = async (client, bookingId, userId) => {
  const query = `
    INSERT INTO review_requests (booking_id, user_id, sent_at, status)
    VALUES ($1, $2, NOW(), 'pending')
    RETURNING id
  `;
  const result = await client.query(query, [bookingId, userId]);
  return result.rows[0];
};

/**
 * Check corporate budget availability (PRD Section 10.10)
 */
const checkCorporateBudget = async (corporateAccountId, amount) => {
  const accountQuery = `
    SELECT budget_amount, budget_period
    FROM corporate_accounts
    WHERE id = $1
  `;
  const accountResult = await pool.query(accountQuery, [corporateAccountId]);

  if (accountResult.rows.length === 0) {
    return { allowed: true }; // No budget set = unlimited
  }

  const account = accountResult.rows[0];
  const budgetAmount = parseFloat(account.budget_amount);

  if (!budgetAmount || budgetAmount === 0) {
    return { allowed: true };
  }

  // Calculate period start date
  const now = new Date();
  let startDate;

  if (account.budget_period === "monthly") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (account.budget_period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now);
    startDate.setDate(diff);
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  // Get current spend
  const spendQuery = `
    SELECT COALESCE(SUM(total_amount), 0) AS total_spent
    FROM bookings
    WHERE corporate_account_id = $1
      AND status IN ('confirmed', 'in_progress', 'completed')
      AND created_at >= $2
  `;
  const spendResult = await pool.query(spendQuery, [
    corporateAccountId,
    startDate,
  ]);
  const currentSpend = parseFloat(spendResult.rows[0].total_spent);
  const projectedSpend = currentSpend + parseFloat(amount);

  if (projectedSpend > budgetAmount) {
    return {
      allowed: false,
      reason: `Budget exceeded. Available: ₦${(budgetAmount - currentSpend).toFixed(2)}, Required: ₦${amount}`,
    };
  }

  return { allowed: true };
};

/**
 * Generate unique 6-digit check-in code for confirmed booking
 */
const generateCheckinCode = async (client) => {
  let isUnique = false;
  let code = "";
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = crypto.randomInt(100000, 999999).toString();
    attempts++;

    const checkQuery = `
      SELECT id FROM bookings 
      WHERE checkin_code = $1 
      AND status IN ('confirmed', 'in_progress')
      LIMIT 1
    `;
    const res = await client.query(checkQuery, [code]);

    if (res.rows.length === 0) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new Error("Failed to generate unique check-in code");
  }

  return code;
};

/**
 * Generate idempotency key for webhook deduplication
 */
const generateIdempotencyKey = (reference, provider) => {
  const timestamp = Date.now().toString();
  return `${provider}:${reference}:${timestamp}`;
};

/**
 * Log system action (PRD Section 12)
 */
const logSystemAction = async (client, action, details) => {
  const query = `
    INSERT INTO system_logs (action, details, created_at)
    VALUES ($1, $2, NOW())
  `;
  await client.query(query, [action, JSON.stringify(details)]);
};

/**
 * Log admin action (PRD Section 12)
 */
const logAdminAction = async (client, adminId, action, details) => {
  const query = `
    INSERT INTO admin_logs (admin_id, action, details, created_at)
    VALUES ($1, $2, $3, NOW())
  `;
  await client.query(query, [adminId, action, JSON.stringify(details)]);
};

// ================================================================
// PAYSTACK API FUNCTIONS
// ================================================================

/**
 * Initialize Paystack transaction
 * @param {object} data - { email, amount, reference, metadata, callbackUrl }
 * @returns {object} - { authorization_url, access_code, reference }
 */
export const initializePaystackTransaction = async (data) => {
  const config = getProviderConfig(PAYMENT_PROVIDERS.PAYSTACK);

  const payload = {
    email: data.email,
    amount: Math.round(data.amount * 100), // Paystack uses kobo (multiply by 100)
    reference: data.reference,
    callback_url: data.callbackUrl || config.callbackUrl,
    currency: CURRENCY,
    metadata: {
      booking_id: data.metadata?.booking_id,
      workspace_id: data.metadata?.workspace_id,
      user_id: data.metadata?.user_id,
      cancel_action: data.metadata?.cancel_action,
      custom_fields: data.metadata?.custom_fields || [],
    },
  };

  try {
    const response = await axios.post(
      `${config.baseUrl}/transaction/initialize`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data.status) {
      return {
        success: true,
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } else {
      throw new Error(
        response.data.message || "Paystack initialization failed",
      );
    }
  } catch (error) {
    console.error(
      "❌ Paystack initialization error:",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.message || "Payment initialization failed",
    );
  }
};

/**
 * Verify Paystack transaction
 * @param {string} reference - Transaction reference
 * @returns {object} - { status, amount, metadata, transaction_date }
 */
export const verifyPaystackTransaction = async (reference) => {
  const config = getProviderConfig(PAYMENT_PROVIDERS.PAYSTACK);

  try {
    const response = await axios.get(
      `${config.baseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data.status) {
      const data = response.data.data;
      return {
        success: true,
        status: data.status,
        amount: data.amount / 100, // Convert from kobo to naira
        reference: data.reference,
        metadata: data.metadata,
        transaction_date: data.transaction_date,
        gateway_response: data.gateway_response,
        channel: data.channel,
      };
    } else {
      throw new Error(
        response.data.message || "Transaction verification failed",
      );
    }
  } catch (error) {
    console.error(
      "❌ Paystack verification error:",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.message || "Transaction verification failed",
    );
  }
};

/**
 * Refund Paystack transaction
 * @param {object} data - { transactionId, amount, reason }
 * @returns {object} - { status, refund_id }
 */
export const refundPaystackTransaction = async (data) => {
  const config = getProviderConfig(PAYMENT_PROVIDERS.PAYSTACK);

  const payload = {
    transaction: data.transactionId,
    amount: Math.round(data.amount * 100), // Convert to kobo
    currency: CURRENCY,
  };

  try {
    const response = await axios.post(`${config.baseUrl}/refund`, payload, {
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.data.status) {
      return {
        success: true,
        status: response.data.data.status,
        refund_id: response.data.data.id,
      };
    } else {
      throw new Error(response.data.message || "Refund failed");
    }
  } catch (error) {
    console.error(
      "❌ Paystack refund error:",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.message || "Refund processing failed",
    );
  }
};

// ================================================================
// FLUTTERWAVE API FUNCTIONS
// ================================================================

/**
 * Initialize Flutterwave transaction
 * @param {object} data - { email, amount, reference, metadata, callbackUrl, customer }
 * @returns {object} - { link, reference, transaction_id }
 */
export const initializeFlutterwaveTransaction = async (data) => {
  const config = getProviderConfig(PAYMENT_PROVIDERS.FLUTTERWAVE);

  const payload = {
    tx_ref: data.reference,
    amount: data.amount,
    currency: CURRENCY,
    redirect_url: data.callbackUrl || config.callbackUrl,
    payment_options: "card,ussd,banktransfer",
    customer: {
      email: data.email,
      name: data.customer?.name || "Customer",
      phonenumber: data.customer?.phone || "",
    },
    customizations: {
      title: "SpaceShare Booking Payment",
      description: `Booking for workspace ${data.metadata?.workspace_id || ""}`,
      logo: process.env.APP_LOGO_URL || "",
    },
    meta: {
      booking_id: data.metadata?.booking_id,
      workspace_id: data.metadata?.workspace_id,
      user_id: data.metadata?.user_id,
    },
  };

  try {
    const response = await axios.post(`${config.baseUrl}/payments`, payload, {
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.data.status === "success") {
      return {
        success: true,
        link: response.data.data.link,
        reference: response.data.data.tx_ref,
        transaction_id: response.data.data.id,
      };
    } else {
      throw new Error(
        response.data.message || "Flutterwave initialization failed",
      );
    }
  } catch (error) {
    console.error(
      "❌ Flutterwave initialization error:",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.message || "Payment initialization failed",
    );
  }
};

/**
 * Verify Flutterwave transaction
 * @param {string} transactionId - Flutterwave transaction ID
 * @param {string} reference - Transaction reference
 * @returns {object} - { status, amount, metadata, transaction_date }
 */
export const verifyFlutterwaveTransaction = async (
  transactionId,
  reference,
) => {
  const config = getProviderConfig(PAYMENT_PROVIDERS.FLUTTERWAVE);

  try {
    const response = await axios.get(
      `${config.baseUrl}/transactions/${transactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data.status === "success") {
      const data = response.data.data;
      return {
        success: true,
        status: data.status,
        amount: data.amount,
        reference: data.tx_ref,
        metadata: data.meta,
        transaction_date: data.created_at,
        gateway_response: data.status,
        channel: data.payment_type,
      };
    } else {
      throw new Error(
        response.data.message || "Transaction verification failed",
      );
    }
  } catch (error) {
    console.error(
      "❌ Flutterwave verification error:",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.message || "Transaction verification failed",
    );
  }
};

/**
 * Refund Flutterwave transaction
 * @param {object} data - { transactionId, amount, reason }
 * @returns {object} - { status, refund_id }
 */
export const refundFlutterwaveTransaction = async (data) => {
  const config = getProviderConfig(PAYMENT_PROVIDERS.FLUTTERWAVE);

  const payload = {
    amount: data.amount,
    reason: data.reason || "Customer requested refund",
  };

  try {
    const response = await axios.post(
      `${config.baseUrl}/transactions/${data.transactionId}/refund`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data.status === "success") {
      return {
        success: true,
        status: response.data.data.status,
        refund_id: response.data.data.id,
      };
    } else {
      throw new Error(response.data.message || "Refund failed");
    }
  } catch (error) {
    console.error(
      "❌ Flutterwave refund error:",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.message || "Refund processing failed",
    );
  }
};

// ================================================================
// WEBHOOK VERIFICATION
// ================================================================

/**
 * Verify Paystack webhook signature
 * @param {string} signature - x-paystack-signature header
 * @param {string} payload - Raw request body
 * @param {string} secret - Webhook secret key
 * @returns {boolean} - True if signature is valid
 */
export const verifyPaystackWebhook = (signature, payload, secret) => {
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha512", secret)
    .update(payload)
    .digest("hex");
  return hash === signature;
};

/**
 * Verify Flutterwave webhook signature
 * @param {string} signature - verif-hash header
 * @param {string} secret - Webhook secret key
 * @param {string} payload - Raw request body
 * @returns {boolean} - True if signature is valid
 */
export const verifyFlutterwaveWebhook = (signature, secret, payload) => {
  // Flutterwave webhook verification
  return signature === secret;
};

// ================================================================
// CORE PAYMENT FUNCTIONS
// ================================================================

/**
 * Generate unique payment reference
 * @param {string} prefix - Optional prefix (default: 'SPC')
 * @returns {string} - Unique reference (e.g., SPC-20260730-ABC123)
 */
export const generatePaymentReference = (prefix = "SPC") => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${date}-${random}`;
};

/**
 * Process payment for a booking
 * @param {object} data - { bookingId, userId, email, amount, provider, paymentMethod }
 * @returns {object} - { success, paymentUrl, reference, provider }
 */
export const processPayment = async (data) => {
  const {
    bookingId,
    userId,
    email,
    amount,
    provider = DEFAULT_PROVIDER,
    paymentMethod = "card",
  } = data;

  // Validate booking exists and is in correct state
  const bookingQuery = `
    SELECT b.id, b.workspace_id, b.total_amount, b.status, b.seeker_id, b.mode, b.corporate_account_id,
           b.start_time, b.end_time,
           w.title as workspace_title, w.host_id
    FROM bookings b
    JOIN workspaces w ON b.workspace_id = w.id
    WHERE b.id = $1 AND b.seeker_id = $2
  `;
  const bookingResult = await pool.query(bookingQuery, [bookingId, userId]);

  if (bookingResult.rows.length === 0) {
    throw new Error("Booking not found or unauthorized");
  }

  const booking = bookingResult.rows[0];

  // Check if already confirmed
  if (booking.status === "confirmed" || booking.status === "in_progress") {
    throw new Error("Booking is already confirmed");
  }

  // Validate amount matches
  if (parseFloat(booking.total_amount) !== parseFloat(amount)) {
    throw new Error("Amount does not match booking total");
  }

  // Check payment attempt limit (prevent abuse)
  const attemptQuery = `
    SELECT payment_attempts, last_payment_attempt
    FROM bookings
    WHERE id = $1
  `;
  const attemptResult = await pool.query(attemptQuery, [bookingId]);
  const attempts = parseInt(attemptResult.rows[0]?.payment_attempts || 0);

  if (attempts >= 5) {
    throw new Error(
      "Maximum payment attempts exceeded. Please contact support.",
    );
  }

  // Request-to-Book requires host approval first (PRD Section 10.5)
  if (booking.mode === "request" && booking.status === "pending") {
    throw new Error(
      "This booking requires host approval before payment. Please wait for host confirmation.",
    );
  }

  // Corporate budget check (PRD Section 10.10)
  if (booking.corporate_account_id) {
    const budgetCheck = await checkCorporateBudget(
      booking.corporate_account_id,
      amount,
    );
    if (!budgetCheck.allowed) {
      throw new Error(budgetCheck.reason);
    }
  }

  // Validate against workspace pricing tiers (PRD Section 11.5)
  const pricingQuery = `
    SELECT hourly_rate, daily_rate, weekly_rate
    FROM workspace_pricing
    WHERE workspace_id = $1
  `;
  const pricingResult = await pool.query(pricingQuery, [booking.workspace_id]);

  if (pricingResult.rows.length > 0) {
    const pricing = pricingResult.rows[0];
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);

    let expectedAmount = null;

    // Check if it's a weekly booking (>= 5 days)
    if (durationHours >= 120 && pricing.weekly_rate) {
      const weeks = Math.ceil(durationHours / 168);
      expectedAmount = pricing.weekly_rate * weeks;
    }
    // Check if it's a daily booking (>= 24 hours)
    else if (durationHours >= 24 && pricing.daily_rate) {
      const days = Math.ceil(durationHours / 24);
      expectedAmount = pricing.daily_rate * days;
    }
    // Hourly booking
    else if (pricing.hourly_rate) {
      expectedAmount = pricing.hourly_rate * Math.ceil(durationHours);
    }

    if (
      expectedAmount !== null &&
      Math.abs(parseFloat(amount) - expectedAmount) > 0.01
    ) {
      throw new Error(
        `Amount mismatch. Expected: ₦${expectedAmount.toFixed(2)}, Received: ₦${amount}`,
      );
    }
  }

  // Calculate commission
  const { commission, netAmount } = calculateCommission(parseFloat(amount));

  // Generate reference
  const reference = generatePaymentReference();

  // Update payment attempts
  await pool.query(
    `UPDATE bookings 
     SET payment_attempts = payment_attempts + 1, 
         last_payment_attempt = NOW() 
     WHERE id = $1`,
    [bookingId],
  );

  // Create transaction record with payment metadata
  const transactionQuery = `
    INSERT INTO transactions (
      booking_id, amount, commission_amount, type, status, reference,
      payment_method, provider_fee, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING id
  `;
  const transactionResult = await pool.query(transactionQuery, [
    bookingId,
    amount,
    commission,
    "payment",
    PAYMENT_STATUS.PENDING,
    reference,
    paymentMethod,
    parseFloat(amount) * 0.015, // ~1.5% provider fee
  ]);

  const transactionId = transactionResult.rows[0].id;

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(reference, provider);

  // Initialize payment with provider
  let paymentResult;
  const metadata = {
    booking_id: bookingId,
    workspace_id: booking.workspace_id,
    user_id: userId,
    transaction_id: transactionId,
  };

  try {
    if (provider === PAYMENT_PROVIDERS.PAYSTACK) {
      paymentResult = await initializePaystackTransaction({
        email,
        amount,
        reference,
        metadata,
        // Use FRONTEND_URL, not APP_URL (PRD Section 11.8)
        callbackUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/callback`,
      });
    } else if (provider === PAYMENT_PROVIDERS.FLUTTERWAVE) {
      paymentResult = await initializeFlutterwaveTransaction({
        email,
        amount,
        reference,
        metadata,
        // Use FRONTEND_URL, not APP_URL (PRD Section 11.8)
        callbackUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/callback`,
      });
    } else {
      throw new Error(`Unsupported payment provider: ${provider}`);
    }

    if (!paymentResult.success) {
      // Update transaction as failed
      await pool.query(
        "UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2",
        [PAYMENT_STATUS.FAILED, transactionId],
      );
      throw new Error("Payment initialization failed");
    }

    // Store idempotency key
    await pool.query(
      `UPDATE transactions 
       SET payment_reference = $1, webhook_idempotency_key = $2, updated_at = NOW() 
       WHERE id = $3`,
      [paymentResult.reference || reference, idempotencyKey, transactionId],
    );

    return {
      success: true,
      paymentUrl: paymentResult.authorization_url || paymentResult.link,
      reference: paymentResult.reference || reference,
      provider: provider,
      transactionId: transactionId,
      bookingId: bookingId,
      amount: amount,
      commission: commission,
      netAmount: netAmount,
    };
  } catch (error) {
    console.error("❌ Payment processing error:", error.message);
    // Update transaction as failed
    await pool.query(
      "UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2",
      [PAYMENT_STATUS.FAILED, transactionId],
    );
    throw error;
  }
};

/**
 * Handle successful payment webhook
 * @param {object} data - { reference, provider, amount, metadata, status }
 * @returns {object} - { success, bookingId, transactionId }
 */
export const handlePaymentSuccess = async (data) => {
  const { reference, provider, amount, metadata, status } = data;

  // Start transaction
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find transaction by reference
    const transactionQuery = `
      SELECT id, booking_id, amount, commission_amount, status, webhook_idempotency_key
      FROM transactions
      WHERE reference = $1 OR payment_reference = $1
      FOR UPDATE
    `;
    const transactionResult = await client.query(transactionQuery, [reference]);

    if (transactionResult.rows.length === 0) {
      throw new Error("Transaction not found");
    }

    const transaction = transactionResult.rows[0];

    // Check if already processed
    if (transaction.status === PAYMENT_STATUS.SUCCESSFUL) {
      await client.query("COMMIT");
      return {
        success: true,
        alreadyProcessed: true,
        bookingId: transaction.booking_id,
      };
    }

    // Check idempotency to prevent duplicate processing
    if (transaction.webhook_idempotency_key) {
      const idempotencyCheck = await client.query(
        "SELECT id FROM transactions WHERE webhook_idempotency_key = $1 AND status = $2",
        [transaction.webhook_idempotency_key, PAYMENT_STATUS.SUCCESSFUL],
      );
      if (idempotencyCheck.rows.length > 0) {
        await client.query("COMMIT");
        return { success: true, alreadyProcessed: true };
      }
    }

    // Verify amount matches
    if (parseFloat(transaction.amount) !== parseFloat(amount)) {
      throw new Error("Amount mismatch");
    }

    // Update transaction with webhook tracking
    await client.query(
      `UPDATE transactions 
       SET status = $1, 
           provider_fee = $2,
           webhook_attempts = COALESCE(webhook_attempts, 0) + 1,
           last_webhook_attempt = NOW(),
           updated_at = NOW() 
       WHERE id = $3`,
      [PAYMENT_STATUS.SUCCESSFUL, parseFloat(amount) * 0.015, transaction.id],
    );

    // Generate check-in code for the booking
    const checkinCode = await generateCheckinCode(client);

    // Update booking status to confirmed
    const bookingUpdate = await client.query(
      `UPDATE bookings 
       SET status = 'confirmed', 
           checkin_code = $1,
           updated_at = NOW() 
       WHERE id = $2
       RETURNING workspace_id, seeker_id`,
      [checkinCode, transaction.booking_id],
    );

    const booking = bookingUpdate.rows[0];

    // Get host details
    const hostQuery = `
      SELECT w.host_id, w.title, u.full_name as host_name
      FROM workspaces w
      JOIN users u ON w.host_id = u.id
      WHERE w.id = $1
    `;
    const hostResult = await client.query(hostQuery, [booking.workspace_id]);

    if (hostResult.rows.length === 0) {
      throw new Error("Workspace not found");
    }

    const hostId = hostResult.rows[0].host_id;
    const workspaceTitle = hostResult.rows[0].title;
    const netAmount =
      parseFloat(transaction.amount) -
      parseFloat(transaction.commission_amount || 0);

    // Insert or update wallet
    await client.query(
      `INSERT INTO wallets (host_id, balance, currency, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (host_id) 
       DO UPDATE SET 
         balance = wallets.balance + $2,
         updated_at = NOW()`,
      [hostId, netAmount, CURRENCY],
    );

    // ✅ FIX: Schedule payout with 24-hour hold (PRD Section 10.8, 11.8)
    // Call the wallet service to schedule the payout
    // This creates a payout_schedule record that will be processed after 24 hours
    await scheduleHostPayout(client, hostId, transaction.booking_id, netAmount);

    // Create review request (PRD Section 10.3)
    await createReviewRequest(
      client,
      transaction.booking_id,
      booking.seeker_id,
    );

    // Get seeker details for notifications
    const seekerQuery = `
      SELECT full_name, email
      FROM users
      WHERE id = $1
    `;
    const seekerResult = await client.query(seekerQuery, [booking.seeker_id]);
    const seeker = seekerResult.rows[0];

    // Get booking details for notifications
    const bookingDetailsQuery = `
      SELECT start_time, end_time
      FROM bookings
      WHERE id = $1
    `;
    const bookingDetailsResult = await client.query(bookingDetailsQuery, [
      transaction.booking_id,
    ]);
    const bookingDetails = bookingDetailsResult.rows[0];
    const startTime = new Date(bookingDetails.start_time).toLocaleString();

    await client.query("COMMIT");

    // Trigger notifications (PRD Section 10.9)
    // Notification to seeker: Booking confirmed
    await createNotification(
      booking.seeker_id,
      "booking_confirmed",
      "Booking Confirmed! 🎉",
      `Your booking at "${workspaceTitle}" is confirmed. Check-in code: ${checkinCode}`,
      {
        bookingId: transaction.booking_id,
        checkinCode,
        workspace: workspaceTitle,
      },
    );

    // Notification to host: New booking received
    await createNotification(
      hostId,
      "new_booking",
      "New Booking Received 📋",
      `${seeker.full_name} has booked your space "${workspaceTitle}" for ${startTime}`,
      {
        bookingId: transaction.booking_id,
        seeker: seeker.full_name,
        startTime,
      },
    );

    // Notification: Payment confirmed
    await createNotification(
      booking.seeker_id,
      "payment_confirmed",
      "Payment Confirmed ✅",
      `Your payment of ₦${transaction.amount} for "${workspaceTitle}" was successful.`,
      { bookingId: transaction.booking_id, amount: transaction.amount },
    );

    // ✅ Notification: Payout scheduled (PRD Section 10.9)
    await createNotification(
      hostId,
      "payout_scheduled",
      "Payout Scheduled 💰",
      `Your payout of ₦${netAmount.toFixed(2)} for booking "${workspaceTitle}" has been scheduled and will be available in 24 hours.`,
      {
        bookingId: transaction.booking_id,
        amount: netAmount,
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
      },
    );

    // Log system action (PRD Section 12)
    await logSystemAction(client, "payment_webhook_success", {
      bookingId: transaction.booking_id,
      amount: transaction.amount,
      provider,
      checkinCode,
      hostId,
      netAmount,
    });

    console.log(`✅ Payment successful for booking ${transaction.booking_id}`);
    console.log(
      `💰 Payout of ₦${netAmount.toFixed(2)} scheduled for host ${hostId} (24-hour hold)`,
    );

    return {
      success: true,
      bookingId: transaction.booking_id,
      transactionId: transaction.id,
      checkinCode,
      netAmount,
      payoutScheduled: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Payment success handling error:", error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Handle payment failure webhook
 * @param {object} data - { reference, provider, message }
 * @returns {object} - { success }
 */
export const handlePaymentFailure = async (data) => {
  const { reference, provider, message } = data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update transaction status with webhook tracking
    const result = await client.query(
      `UPDATE transactions 
       SET status = $1, 
           webhook_attempts = COALESCE(webhook_attempts, 0) + 1,
           last_webhook_attempt = NOW(),
           updated_at = NOW() 
       WHERE reference = $2 OR payment_reference = $2
       RETURNING booking_id`,
      [PAYMENT_STATUS.FAILED, reference],
    );

    if (result.rows.length > 0) {
      const bookingId = result.rows[0].booking_id;

      // Update booking status to show payment failed
      await client.query(
        `UPDATE bookings 
         SET status = 'payment_failed', updated_at = NOW() 
         WHERE id = $1`,
        [bookingId],
      );

      // Log the failure
      await logSystemAction(client, "payment_webhook_failure", {
        bookingId,
        provider,
        message,
        reference,
      });

      // Notify user of payment failure (PRD Section 10.9)
      const seekerQuery = `
        SELECT seeker_id FROM bookings WHERE id = $1
      `;
      const seekerResult = await client.query(seekerQuery, [bookingId]);

      if (seekerResult.rows.length > 0) {
        await createNotification(
          seekerResult.rows[0].seeker_id,
          "payment_failed",
          "Payment Failed ❌",
          `Your payment for booking #${bookingId} failed. Please try again or contact support.`,
          { bookingId, reason: message },
        );
      }

      console.log(`❌ Payment failed for booking ${bookingId}: ${message}`);
    }

    await client.query("COMMIT");

    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Payment failure handling error:", error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Process refund for a booking
 * @param {object} data - { bookingId, amount, reason, adminId, partial }
 * @returns {object} - { success, refundId }
 */
export const processRefund = async (data) => {
  const { bookingId, amount, reason, adminId, partial = false } = data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find the original transaction
    const transactionQuery = `
      SELECT id, payment_reference, amount, commission_amount, status
      FROM transactions
      WHERE booking_id = $1 AND type = 'payment' AND status = 'successful'
      FOR UPDATE
    `;
    const transactionResult = await client.query(transactionQuery, [bookingId]);

    if (transactionResult.rows.length === 0) {
      throw new Error("No successful payment found for this booking");
    }

    const transaction = transactionResult.rows[0];

    // Check if already refunded
    const refundCheck = await client.query(
      "SELECT id FROM transactions WHERE booking_id = $1 AND type = $2 AND status = $3",
      [bookingId, "refund", PAYMENT_STATUS.SUCCESSFUL],
    );

    if (refundCheck.rows.length > 0) {
      throw new Error("Booking already refunded");
    }

    // Calculate refund amount (support partial refunds - PRD Section 17.3)
    let refundAmount;
    if (partial) {
      refundAmount = await calculatePartialRefund(bookingId);
      if (refundAmount === 0) {
        throw new Error(
          "No refund available for this booking based on cancellation policy",
        );
      }
    } else {
      refundAmount = amount || parseFloat(transaction.amount);
    }

    const refundCommission = parseFloat(transaction.commission_amount || 0);

    // Create refund transaction record
    const refundQuery = `
      INSERT INTO transactions (
        booking_id, amount, commission_amount, type, status, reference,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `;
    const refundResult = await client.query(refundQuery, [
      bookingId,
      refundAmount,
      refundCommission,
      "refund",
      PAYMENT_STATUS.PENDING,
      generatePaymentReference("REF"),
    ]);

    const refundId = refundResult.rows[0].id;

    // Process refund with provider (if we have payment_reference)
    let refundSuccess = false;
    let providerRefundStatus = "pending";

    if (transaction.payment_reference) {
      try {
        const provider = transaction.payment_reference.startsWith("FLW")
          ? PAYMENT_PROVIDERS.FLUTTERWAVE
          : PAYMENT_PROVIDERS.PAYSTACK;

        let refundResult;
        if (provider === PAYMENT_PROVIDERS.PAYSTACK) {
          refundResult = await refundPaystackTransaction({
            transactionId: transaction.payment_reference,
            amount: refundAmount,
            reason: reason || "Customer requested refund",
          });
        } else {
          refundResult = await refundFlutterwaveTransaction({
            transactionId: transaction.payment_reference,
            amount: refundAmount,
            reason: reason || "Customer requested refund",
          });
        }

        refundSuccess = refundResult.success;
        providerRefundStatus = refundResult.status || "completed";

        if (refundSuccess) {
          await client.query(
            "UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2",
            [PAYMENT_STATUS.SUCCESSFUL, refundId],
          );
        }
      } catch (error) {
        console.error("❌ Provider refund failed:", error.message);
        // Mark as pending for manual processing
        await client.query(
          "UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2",
          ["pending_refund", refundId],
        );
        providerRefundStatus = "pending_manual";
      }
    }

    // If refund successful, deduct from wallet
    if (refundSuccess) {
      // Get host_id from workspace via booking
      const hostQuery = `
        SELECT w.host_id
        FROM workspaces w
        JOIN bookings b ON b.workspace_id = w.id
        WHERE b.id = $1
      `;
      const hostResult = await client.query(hostQuery, [bookingId]);

      if (hostResult.rows.length > 0) {
        const hostId = hostResult.rows[0].host_id;
        const netAmount = refundAmount - refundCommission;

        await client.query(
          `UPDATE wallets 
           SET balance = balance - $1, updated_at = NOW() 
           WHERE host_id = $2 AND balance >= $1`,
          [netAmount, hostId],
        );
      }

      // Update booking status to cancelled
      await client.query(
        `UPDATE bookings 
         SET status = 'cancelled', updated_at = NOW() 
         WHERE id = $1`,
        [bookingId],
      );

      // Notify user of refund
      await createNotification(
        (
          await client.query("SELECT seeker_id FROM bookings WHERE id = $1", [
            bookingId,
          ])
        ).rows[0].seeker_id,
        "refund_processed",
        "Refund Processed 💰",
        `Your refund of ₦${refundAmount} has been processed for booking #${bookingId}.`,
        { bookingId, refundAmount },
      );
    }

    // Log admin action (PRD Section 12)
    if (adminId) {
      await logAdminAction(client, adminId, "refund", {
        bookingId,
        refundId,
        refundAmount,
        reason,
        partial,
        providerRefundStatus,
      });
    }

    // Log system action
    await logSystemAction(client, "refund_processed", {
      bookingId,
      refundId,
      refundAmount,
      success: refundSuccess,
      providerRefundStatus,
    });

    await client.query("COMMIT");

    return {
      success: refundSuccess,
      refundId: refundId,
      bookingId: bookingId,
      amount: refundAmount,
      status: refundSuccess ? PAYMENT_STATUS.SUCCESSFUL : "pending_refund",
      providerStatus: providerRefundStatus,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Refund processing error:", error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get payment status by booking ID
 * @param {string} bookingId - Booking ID
 * @returns {object} - { status, amount, reference, payment_date }
 */
export const getPaymentStatus = async (bookingId) => {
  const query = `
    SELECT 
      id, 
      amount, 
      commission_amount, 
      type, 
      status, 
      reference, 
      payment_reference,
      payment_method,
      provider_fee,
      created_at as payment_date,
      webhook_attempts,
      last_webhook_attempt
    FROM transactions
    WHERE booking_id = $1 AND type = 'payment'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [bookingId]);

  if (result.rows.length === 0) {
    return { exists: false };
  }

  return {
    exists: true,
    ...result.rows[0],
    payment_date: result.rows[0].payment_date.toISOString(),
  };
};

// ================================================================
// EXPORTS
// ================================================================

export default {
  // Provider functions
  initializePaystackTransaction,
  verifyPaystackTransaction,
  refundPaystackTransaction,
  initializeFlutterwaveTransaction,
  verifyFlutterwaveTransaction,
  refundFlutterwaveTransaction,

  // Webhook verification
  verifyPaystackWebhook,
  verifyFlutterwaveWebhook,

  // Core functions
  generatePaymentReference,
  processPayment,
  handlePaymentSuccess,
  handlePaymentFailure,
  processRefund,
  getPaymentStatus,

  // Helper functions (exported for testing)
  createNotification,
  calculatePartialRefund,
  createReviewRequest,
  checkCorporateBudget,
  generateCheckinCode,
  generateIdempotencyKey,
  logSystemAction,
  logAdminAction,
};
