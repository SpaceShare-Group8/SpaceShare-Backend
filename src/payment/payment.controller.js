// ================================================================
// PAYMENT CONTROLLER
// HTTP request handlers for payment endpoints
// PRD Section 11.8 - Payments, 16.5 - Payments & Payouts
// ================================================================

import {
  processPayment,
  handlePaymentSuccess,
  handlePaymentFailure,
  processRefund,
  getPaymentStatus,
  generatePaymentReference,
  verifyPaystackWebhook,
  verifyFlutterwaveWebhook
} from './payment.service.js';
import pool from '../common/config/db.js';
import { PAYMENT_PROVIDERS, PAYMENT_STATUS, DEFAULT_PROVIDER } from './payment.constants.js';

// ================================================================
// INITIATE PAYMENT
// POST /api/payments/initiate
// ================================================================

/**
 * Initiate a payment for a booking
 * @route POST /api/payments/initiate
 * @access Private (Seeker)
 */
export const initiatePayment = async (req, res) => {
  try {
    const { bookingId, amount, provider } = req.body;
    const userId = req.user.id;
    const email = req.user.email;

    // Validate required fields
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    // Process payment
    const result = await processPayment({
      bookingId,
      userId,
      email,
      amount: parseFloat(amount),
      provider: provider || DEFAULT_PROVIDER
    });

    return res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        paymentUrl: result.paymentUrl,
        reference: result.reference,
        provider: result.provider,
        bookingId: result.bookingId,
        amount: result.amount,
        commission: result.commission,
        netAmount: result.netAmount
      }
    });

  } catch (error) {
    console.error('❌ Initiate payment error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate payment'
    });
  }
};

// ================================================================
// PAYMENT CALLBACK
// GET /api/payments/callback
// ================================================================

/**
 * Handle payment callback from provider (redirect)
 * @route GET /api/payments/callback
 * @access Public
 */
export const paymentCallback = async (req, res) => {
  try {
    const { reference, status, transaction_id, tx_ref } = req.query;

    // Determine provider from reference pattern
    const provider = reference?.startsWith('FLW') || tx_ref?.startsWith('FLW')
      ? PAYMENT_PROVIDERS.FLUTTERWAVE
      : PAYMENT_PROVIDERS.PAYSTACK;

    // Check if payment was successful
    if (status === 'successful' || status === 'success') {
      // Verify the transaction
      let verification;
      const ref = reference || tx_ref;

      try {
        if (provider === PAYMENT_PROVIDERS.PAYSTACK) {
          const { verifyPaystackTransaction } = await import('./payment.service.js');
          verification = await verifyPaystackTransaction(ref);
        } else {
          const { verifyFlutterwaveTransaction } = await import('./payment.service.js');
          verification = await verifyFlutterwaveTransaction(transaction_id, ref);
        }

        if (verification.success && verification.status === 'success') {
          // Handle successful payment
          await handlePaymentSuccess({
            reference: ref,
            provider,
            amount: verification.amount,
            metadata: verification.metadata,
            status: verification.status
          });

          // Redirect to frontend success page
          const successUrl = process.env.PAYMENT_SUCCESS_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`;
          return res.redirect(`${successUrl}?reference=${ref}&booking_id=${verification.metadata?.booking_id}`);
        }
      } catch (error) {
        console.error('❌ Payment verification error:', error.message);
      }
    }

    // Redirect to frontend failure page
    const failureUrl = process.env.PAYMENT_FAILURE_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failure`;
    return res.redirect(`${failureUrl}?reference=${reference || tx_ref}`);

  } catch (error) {
    console.error('❌ Payment callback error:', error.message);
    const failureUrl = process.env.PAYMENT_FAILURE_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failure`;
    return res.redirect(failureUrl);
  }
};

// ================================================================
// PAYMENT WEBHOOK
// POST /api/payments/webhook
// ================================================================

/**
 * Handle payment webhook from provider (server-to-server)
 * @route POST /api/payments/webhook
 * @access Public (but verified with signature)
 */
export const paymentWebhook = async (req, res) => {
  try {
    const payload = req.body;
    const signature = req.headers['x-paystack-signature'] || req.headers['verif-hash'];
    const rawBody = JSON.stringify(req.body);

    // Determine provider from headers or payload
    let provider = PAYMENT_PROVIDERS.PAYSTACK;
    if (req.headers['verif-hash']) {
      provider = PAYMENT_PROVIDERS.FLUTTERWAVE;
    }

    // Verify webhook signature
    let isValid = false;
    if (provider === PAYMENT_PROVIDERS.PAYSTACK) {
      const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
      isValid = verifyPaystackWebhook(signature, rawBody, secret);
    } else {
      const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || process.env.FLUTTERWAVE_SECRET_KEY;
      isValid = verifyFlutterwaveWebhook(signature, secret, rawBody);
    }

    if (!isValid) {
      console.warn('⚠️ Invalid webhook signature');
      return res.status(401).json({ status: 'unauthorized' });
    }

    // Extract event data
    let eventData;
    let eventType;

    if (provider === PAYMENT_PROVIDERS.PAYSTACK) {
      eventData = payload.data;
      eventType = payload.event;
      
      // Paystack event types: charge.success, charge.failed, refund.success, etc.
      if (eventType === 'charge.success') {
        await handlePaymentSuccess({
          reference: eventData.reference,
          provider: PAYMENT_PROVIDERS.PAYSTACK,
          amount: eventData.amount / 100,
          metadata: eventData.metadata,
          status: 'success'
        });
      } else if (eventType === 'charge.failed' || eventType === 'charge.dispute.created') {
        await handlePaymentFailure({
          reference: eventData.reference,
          provider: PAYMENT_PROVIDERS.PAYSTACK,
          message: eventData.gateway_response || 'Payment failed'
        });
      } else if (eventType === 'refund.success') {
        // Update refund status
        await pool.query(
          `UPDATE transactions 
           SET status = $1, updated_at = NOW() 
           WHERE payment_reference = $2`,
          [PAYMENT_STATUS.SUCCESSFUL, eventData.reference]
        );
      }
    } else {
      // Flutterwave
      eventData = payload.data;
      eventType = payload.event;

      if (eventType === 'charge.completed' && eventData.status === 'successful') {
        await handlePaymentSuccess({
          reference: eventData.tx_ref,
          provider: PAYMENT_PROVIDERS.FLUTTERWAVE,
          amount: eventData.amount,
          metadata: eventData.meta,
          status: 'success'
        });
      } else if (eventType === 'charge.completed' && eventData.status === 'failed') {
        await handlePaymentFailure({
          reference: eventData.tx_ref,
          provider: PAYMENT_PROVIDERS.FLUTTERWAVE,
          message: eventData.error || 'Payment failed'
        });
      } else if (eventType === 'refund.success') {
        await pool.query(
          `UPDATE transactions 
           SET status = $1, updated_at = NOW() 
           WHERE payment_reference = $2`,
          [PAYMENT_STATUS.SUCCESSFUL, eventData.tx_ref]
        );
      }
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('❌ Webhook processing error:', error.message);
    // Still return 200 to avoid provider retries
    return res.status(200).json({ status: 'processed' });
  }
};

// ================================================================
// GET PAYMENT STATUS
// GET /api/payments/status/:bookingId
// ================================================================

/**
 * Get payment status for a booking
 * @route GET /api/payments/status/:bookingId
 * @access Private (Seeker who owns the booking)
 */
export const getPaymentStatusByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Verify user owns the booking
    const bookingCheck = await pool.query(
      'SELECT seeker_id FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (bookingCheck.rows[0].seeker_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this payment'
      });
    }

    const paymentStatus = await getPaymentStatus(bookingId);

    return res.status(200).json({
      success: true,
      data: paymentStatus
    });

  } catch (error) {
    console.error('❌ Get payment status error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment status'
    });
  }
};

// ================================================================
// GET WALLET BALANCE
// GET /api/wallet/balance
// ================================================================

/**
 * Get wallet balance for the authenticated host
 * @route GET /api/wallet/balance
 * @access Private (Host only)
 */
export const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is a host
    if (req.user.role !== 'host') {
      return res.status(403).json({
        success: false,
        message: 'Only hosts can access wallet'
      });
    }

    const query = `
      SELECT 
        w.id as wallet_id,
        w.balance,
        w.currency,
        w.updated_at as last_updated,
        (SELECT COUNT(*) FROM transactions t 
         WHERE t.booking_id IN (SELECT id FROM bookings b WHERE b.workspace_id IN (SELECT id FROM workspaces WHERE host_id = $1))
         AND t.type = 'payment' AND t.status = 'successful') as total_transactions
      FROM wallets w
      WHERE w.host_id = $1
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      // Create wallet if it doesn't exist
      await pool.query(
        `INSERT INTO wallets (host_id, balance, currency, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [userId, 0, 'NGN']
      );

      return res.status(200).json({
        success: true,
        data: {
          balance: 0,
          currency: 'NGN',
          total_transactions: 0
        }
      });
    }

    // Get pending withdrawals
    const pendingQuery = `
      SELECT COUNT(*) as pending_count, COALESCE(SUM(amount), 0) as pending_amount
      FROM transactions
      WHERE type = 'payout' AND status = 'pending'
      AND booking_id IN (SELECT id FROM bookings b WHERE b.workspace_id IN (SELECT id FROM workspaces WHERE host_id = $1))
    `;
    const pendingResult = await pool.query(pendingQuery, [userId]);

    return res.status(200).json({
      success: true,
      data: {
        ...result.rows[0],
        pending_withdrawals: {
          count: parseInt(pendingResult.rows[0].pending_count),
          amount: parseFloat(pendingResult.rows[0].pending_amount)
        }
      }
    });

  } catch (error) {
    console.error('❌ Get wallet balance error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get wallet balance'
    });
  }
};

// ================================================================
// REQUEST WITHDRAWAL
// POST /api/wallet/withdraw
// ================================================================

/**
 * Request withdrawal from wallet
 * @route POST /api/wallet/withdraw
 * @access Private (Host only)
 */
export const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, bankCode, accountNumber, accountName } = req.body;

    // Validate inputs
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid withdrawal amount is required'
      });
    }

    if (!bankCode || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Bank code and account number are required'
      });
    }

    // Check wallet balance
    const walletQuery = 'SELECT balance FROM wallets WHERE host_id = $1';
    const walletResult = await pool.query(walletQuery, [userId]);

    if (walletResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const balance = parseFloat(walletResult.rows[0].balance);
    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount > balance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ${balance}`
      });
    }

    // Create withdrawal transaction
    const reference = generatePaymentReference('WTH');
    const query = `
      INSERT INTO transactions (
        booking_id, amount, commission_amount, type, status, reference,
        payment_reference, created_at, updated_at
      ) VALUES (
        NULL, $1, $2, 'payout', 'pending', $3, $4, NOW(), NOW()
      )
      RETURNING id
    `;
    const result = await pool.query(query, [
      withdrawAmount,
      0,
      reference,
      JSON.stringify({ bankCode, accountNumber, accountName })
    ]);

    // Deduct from wallet (will be finalized when withdrawal is processed)
    await pool.query(
      `UPDATE wallets 
       SET balance = balance - $1, updated_at = NOW() 
       WHERE host_id = $2`,
      [withdrawAmount, userId]
    );

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        reference: reference,
        amount: withdrawAmount,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ Withdrawal request error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process withdrawal request'
    });
  }
};

// ================================================================
// PROCESS REFUND (Admin Only)
// POST /api/payments/refund
// ================================================================

/**
 * Process refund for a booking (Admin only)
 * @route POST /api/payments/refund
 * @access Private (Admin only)
 */
export const processRefundRequest = async (req, res) => {
  try {
    const { bookingId, amount, reason } = req.body;
    const adminId = req.user.id;

    // Validate inputs
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Verify booking exists
    const bookingCheck = await pool.query(
      'SELECT id, status FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const result = await processRefund({
      bookingId,
      amount: amount ? parseFloat(amount) : undefined,
      reason: reason || 'Admin initiated refund',
      adminId
    });

    return res.status(200).json({
      success: result.success,
      message: result.success ? 'Refund processed successfully' : 'Refund pending processing',
      data: {
        refundId: result.refundId,
        bookingId: result.bookingId,
        amount: result.amount,
        status: result.status
      }
    });

  } catch (error) {
    console.error('❌ Refund request error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund'
    });
  }
};

// ================================================================
// GET WITHDRAWAL HISTORY
// GET /api/wallet/withdrawals
// ================================================================

/**
 * Get withdrawal history for the authenticated host
 * @route GET /api/wallet/withdrawals
 * @access Private (Host only)
 */
export const getWithdrawalHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        id,
        reference,
        amount,
        status,
        payment_reference as bank_details,
        created_at as requested_at,
        updated_at as processed_at
      FROM transactions
      WHERE type = 'payout'
      AND booking_id IN (
        SELECT id FROM bookings b 
        WHERE b.workspace_id IN (SELECT id FROM workspaces WHERE host_id = $1)
      )
    `;
    const params = [userId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM transactions
      WHERE type = 'payout'
      AND booking_id IN (
        SELECT id FROM bookings b 
        WHERE b.workspace_id IN (SELECT id FROM workspaces WHERE host_id = $1)
      )
    `;
    const countParams = [userId];

    if (status) {
      countQuery += ` AND status = $2`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        bank_details: row.bank_details ? JSON.parse(row.bank_details) : null
      })),
      meta: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get withdrawal history error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get withdrawal history'
    });
  }
};

// ================================================================
// GET TRANSACTION HISTORY
// GET /api/payments/transactions
// ================================================================

/**
 * Get transaction history for the authenticated user
 * @route GET /api/payments/transactions
 * @access Private
 */
export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, type, status } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        t.id,
        t.booking_id,
        t.amount,
        t.commission_amount,
        t.type,
        t.status,
        t.reference,
        t.created_at,
        b.workspace_id,
        w.title as workspace_title
      FROM transactions t
      LEFT JOIN bookings b ON t.booking_id = b.id
      LEFT JOIN workspaces w ON b.workspace_id = w.id
      WHERE t.booking_id IN (
        SELECT id FROM bookings WHERE seeker_id = $1
      ) OR b.workspace_id IN (
        SELECT id FROM workspaces WHERE host_id = $1
      )
    `;
    const params = [userId];

    if (type) {
      query += ` AND t.type = $${params.length + 1}`;
      params.push(type);
    }

    if (status) {
      query += ` AND t.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      LEFT JOIN bookings b ON t.booking_id = b.id
      LEFT JOIN workspaces w ON b.workspace_id = w.id
      WHERE b.seeker_id = $1 OR w.host_id = $1
    `;
    const countParams = [userId];

    if (type) {
      countQuery += ` AND t.type = $2`;
      countParams.push(type);
    }

    if (status) {
      countQuery += ` AND t.status = $3`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: result.rows,
      meta: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get transaction history error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get transaction history'
    });
  }
};

// ================================================================
// EXPORTS
// ================================================================

export default {
  initiatePayment,
  paymentCallback,
  paymentWebhook,
  getPaymentStatusByBooking,
  getWalletBalance,
  requestWithdrawal,
  processRefundRequest,
  getWithdrawalHistory,
  getTransactionHistory
};