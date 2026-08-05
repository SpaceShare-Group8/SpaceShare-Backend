// ================================================================
// PAYMENT ROUTES
// API routes for payment, wallet, and transaction management
// PRD Section 16.5 - Payments & Payouts
// ================================================================

import { Router } from 'express';
import { protect, authorize } from '../common/middleware/auth.middleware.js';
import {
  initiatePayment,
  paymentCallback,
  paymentWebhook,
  getPaymentStatusByBooking,
  processRefundRequest,
  getTransactionHistory
} from './payment.controller.js';

const router = Router();

// ================================================================
// PUBLIC ROUTES (No authentication required)
// ================================================================

/**
 * @route   GET /api/payments/callback
 * @desc    Handle payment callback from provider (redirect)
 * @access  Public
 */
router.get('/callback', paymentCallback);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle payment webhook from provider (server-to-server)
 * @access  Public (verified by signature)
 */
router.post('/webhook', paymentWebhook);

// ================================================================
// PROTECTED ROUTES (Authentication required)
// ================================================================

/**
 * @route   POST /api/payments/initiate
 * @desc    Initiate a payment for a booking
 * @access  Private (Seeker)
 */
router.post('/initiate', protect, initiatePayment);

/**
 * @route   GET /api/payments/status/:bookingId
 * @desc    Get payment status for a booking
 * @access  Private (Seeker who owns the booking)
 */
router.get('/status/:bookingId', protect, getPaymentStatusByBooking);

/**
 * @route   GET /api/payments/transactions
 * @desc    Get transaction history for authenticated user
 * @access  Private
 */
router.get('/transactions', protect, getTransactionHistory);

// ================================================================
// ADMIN ROUTES
// ================================================================

/**
 * @route   POST /api/payments/refund
 * @desc    Process refund for a booking (Admin only)
 * @access  Private (Admin only)
 */
router.post('/refund', protect, authorize('admin', 'platform_admin'), processRefundRequest);

// ================================================================
// EXPORTS
// ================================================================

export default router;