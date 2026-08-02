import { expireBookings } from "./autoExpiry.js";

/**
 * Starts background scheduled jobs.
 */
export const startJobs = () => {
  console.log("Starting scheduled jobs...");

  // Run every hour
  setInterval(expireBookings, 60 * 60 * 1000);

  console.log("Auto-expiry scheduler started.");
};
