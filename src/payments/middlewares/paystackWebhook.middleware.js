import crypto from "crypto";

/**
 * Verify that the webhook request genuinely came from Paystack.
 */
export function verifyPaystackWebhook(req, res, next) {
    try {
        const hash = crypto
            .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
            .update(JSON.stringify(req.body))
            .digest("hex");

        const signature = req.headers["x-paystack-signature"];

        if (hash !== signature) {
            return res.status(401).json({
                success: false,
                message: "Invalid Paystack webhook signature.",
            });
        }

        next();
    } catch (error) {
        next(error);
    }
}