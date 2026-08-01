import {
    initiatePayment,
    confirmPayment,
} from "../services/payment.service.js";

/**
 * POST /api/payments/initiate
 */
export async function initiatePaymentController(req, res, next) {
    try {
        const payment = await initiatePayment(req.body);

        return res.status(201).json(payment);
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/payments/webhook
 *
 * Paystack sends payment events here.
 */
export async function paystackWebhookController(req, res, next) {
    try {
        const event = req.body;

        /**
         * We only care about successful charges.
         */
        if (event.event === "charge.success") {
            await confirmPayment(event.data.reference);
        }

        return res.status(200).json({
            success: true,
            message: "Webhook received successfully.",
        });
    } catch (error) {
        next(error);
    }
}