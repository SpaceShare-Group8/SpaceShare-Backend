import express from "express";
import {
    initiatePaymentController,
    paystackWebhookController,
} from "../controllers/payment.controller.js";

const router = express.Router();

/**
 * Initialize a payment
 * POST /api/payments/initiate
 */
router.post("/initiate", initiatePaymentController);

/**
 * Paystack webhook
 * POST /api/payments/webhook
 */
router.post("/webhook", paystackWebhookController);

export default router;