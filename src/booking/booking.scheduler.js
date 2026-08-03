import cron from "node-cron";
import pool from "../common/config/db.js";
import { sendNotification } from "../notifications/notification.service.js";

export const sendBookingReminders = async () => {
  try {
    console.log("Running booking reminder job...");
  } catch (error) {
    console.error(error);
  }
};

export const expireBookings = async () => {
  try {
    console.log("Running booking expiry job...");
  } catch (error) {
    console.error(error);
  }
};

/**
 * Auto-completes any session that's still "in_progress" after its
 * end_time has passed. This is what actually gets a booking to
 * 'completed' if the host never manually calls PATCH /:id/complete.
 */
export const completeFinishedBookings = async () => {
  try {
    const result = await pool.query(
      `UPDATE bookings
       SET status = 'completed', updated_at = NOW()
       WHERE status = 'in_progress' AND end_time <= NOW()
       RETURNING id`
    );

    if (result.rows.length > 0) {
      console.log(`✅ Auto-completed ${result.rows.length} finished booking(s)`);
    }
  } catch (error) {
    console.error('Error auto-completing finished bookings:', error);
  }
};

export const initializeBookingScheduler = () => {
  cron.schedule("0 * * * *", sendBookingReminders);
  cron.schedule("*/30 * * * *", expireBookings);
  cron.schedule("*/5 * * * *", completeFinishedBookings); // add this

  console.log(" Booking scheduler initialized");
};