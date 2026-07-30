import cron from "node-cron";

/**
 * Mock query for expired bookings.
 */
async function getExpiredBookings() {
  return [
    {
      id: "booking-001",
      seeker_id: "user-001",
      status: "in_progress",
      end_time: "2026-08-03T16:00:00Z",
    },
  ];
}

/**
 * Mock completion.
 */
async function markBookingCompleted(bookingId) {
  console.log(`[AUTO EXPIRY] Booking ${bookingId} marked as completed.`);
}

/**
 * Mock notification.
 */
async function triggerCompletionNotification(userId, bookingId) {
  console.log(
    `[AUTO EXPIRY] Notification sent to ${userId} for booking ${bookingId}.`,
  );
}

/**
 * Auto-expiry job.
 */
export async function runAutoExpiryJob() {
  console.log("[AUTO EXPIRY] Checking expired bookings...");

  const expiredBookings = await getExpiredBookings();

  for (const booking of expiredBookings) {
    await markBookingCompleted(booking.id);
    await triggerCompletionNotification(booking.seeker_id, booking.id);
  }

  console.log(`[AUTO EXPIRY] ${expiredBookings.length} booking(s) processed.`);
}

/**
 * Run every 5 minutes.
 */
export function startAutoExpiryJob() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await runAutoExpiryJob();
    } catch (error) {
      console.error("[AUTO EXPIRY]", error);
    }
  });

  console.log("[AUTO EXPIRY] Scheduler started.");
}
