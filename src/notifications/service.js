import pool from "../common/config/db.js";

/**
 * Creates a notification.
 */
export async function createNotification({
  userId,
  title,
  message,
  type = "system",
  payload = null,
}) {
  const result = await pool.query(
    `INSERT INTO notifications
        (user_id, title, message, type, payload)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
    [userId, title, message, type, payload],
  );

  return result.rows[0];
}

/**
 * Sends booking confirmation notification.
 */
export async function sendBookingConfirmation(userId, bookingId) {
  return createNotification({
    userId,
    title: "Booking Confirmed",
    message: `Your booking (${bookingId}) has been confirmed.`,
    type: "booking",
    payload: { bookingId },
  });
}

/**
 * Sends booking reminder notification.
 */
export async function sendBookingReminder(userId, bookingId) {
  return createNotification({
    userId,
    title: "Booking Reminder",
    message: `Reminder: Your booking (${bookingId}) starts soon.`,
    type: "reminder",
    payload: { bookingId },
  });
}

/**
 * Sends booking cancellation notification.
 */
export async function sendBookingCancellation(userId, bookingId) {
  return createNotification({
    userId,
    title: "Booking Cancelled",
    message: `Your booking (${bookingId}) has been cancelled.`,
    type: "booking",
    payload: { bookingId },
  });
}
