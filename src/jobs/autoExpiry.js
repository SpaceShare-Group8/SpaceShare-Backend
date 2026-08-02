/**
 * Auto Expiry Job
 *
 * Placeholder scheduled job that expires unpaid bookings.
 * Replace mock data with database queries later.
 */

// Mock bookings
const bookings = [
  {
    id: 1,
    status: "pending_payment",
    expiresAt: new Date(Date.now() - 1000), // already expired
  },
  {
    id: 2,
    status: "confirmed",
    expiresAt: new Date(Date.now() + 3600000),
  },
];

export const expireBookings = async () => {
  console.log("Running auto-expiry job...");

  const now = new Date();

  bookings.forEach((booking) => {
    if (booking.status === "pending_payment" && booking.expiresAt <= now) {
      booking.status = "expired";

      console.log(`Booking #${booking.id} has been automatically expired.`);
    }
  });

  console.log("Auto-expiry job completed.");
};
