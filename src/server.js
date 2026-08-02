import dotenv from "dotenv";
import app from "./app.js";
import { initializeWalletScheduler } from "./wallet/wallet.scheduler.js";
import { initializeBookingScheduler } from "./booking/booking.scheduler.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

/* Start the server */
const server = app.listen(PORT, () => {
  console.log(`🚀 SpaceShare API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(
    `💰 Wallet routes available at: http://localhost:${PORT}/api/wallet`,
  );
  console.log(`ℹ️  Run migrations manually with: npm run migrate`);

  console.log("\n📅 Initializing wallet schedulers...");
  initializeWalletScheduler();
  console.log("✅ Wallet scheduler initialized successfully!\n");
  console.log("📅 Initializing booking schedulers...");
  initializeBookingScheduler();
  console.log("✅ Booking scheduler initialized successfully!\n");
});

/* Handle unhandled promise rejections */
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);

  server.close(() => process.exit(1));
});

/* Handle graceful shutdown */
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

/* Handle Ctrl+C */
process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

export default app;
