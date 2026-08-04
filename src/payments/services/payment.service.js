import crypto from "crypto";
import { sendEmail } from "../../notifications/notification.service.js";
import { initializeTransaction, verifyTransaction } from "./paystackClient.js";

/**
 * Generate a unique payment reference
 * Example: SS-1721859342345-A8F2D1
 */
function generatePaymentReference() {
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `SS-${Date.now()}-${random}`;
}

/**
 * Initialize a payment
 */
export async function initiatePayment(paymentDetails) {
  const reference = generatePaymentReference();

  const payload = {
    email: paymentDetails.email,
    amount: paymentDetails.amount,
    reference,
    callback_url: paymentDetails.callback_url,
    metadata: {
      bookingId: paymentDetails.bookingId,
      userId: paymentDetails.userId,
    },
  };

  /**
   * Call Paystack
   */
  const paystackResponse = await initializeTransaction(payload);

  /**
   * TODO:
   * Save pending payment into the database.
   *
   * Example fields:
   * - booking_id
   * - user_id
   * - reference
   * - amount
   * - status = "pending"
   */

  return {
    success: true,
    message: "Payment initialized successfully.",
    reference,
    authorization_url: paystackResponse.data.authorization_url,
    access_code: paystackResponse.data.access_code,
  };
}

/**
 * Verify payment
 */
export async function confirmPayment(reference) {
  const verification = await verifyTransaction(reference);

  if (verification.data.status !== "success") {
    throw new Error("Payment verification failed.");
  }

  /**
   * TODO:
   * Update payment status in the database.
   * Confirm booking.
   * Trigger wallet credit.
   */

  return verification.data;
}
