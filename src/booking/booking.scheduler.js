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

export const initializeBookingScheduler = () => {
  cron.schedule("0 * * * *", sendBookingReminders);

  cron.schedule("*/30 * * * *", expireBookings);

  console.log(" Booking scheduler initialized");
};
