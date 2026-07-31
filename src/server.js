import dotenv from "dotenv";
import app from "./app.js";
import { initializeWalletScheduler } from "./wallet/wallet.scheduler.js";

/* Route imports */
import authRoutes from "./auth/auth.routes.js";
import workspaceRoutes from "./workspace/workspace.routes.js";
import favoriteRoutes from "./workspace/favorites.routes.js";
import bookingRoutes from "./booking/booking.routes.js";
import corporateRoutes from "./corporate/corporate.routes.js";
import adminRoutes from "./admin/admin.routes.js";

/* Load environment variables */
dotenv.config();

const PORT = process.env.PORT || 5000;

/* Express route mounting */
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/corporate", corporateRoutes);
app.use("/api/admin", adminRoutes);
/* Start the server */
const server = app.listen(PORT, () => {
  console.log(`🚀 SpaceShare API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`💰 Wallet routes available at: http://localhost:${PORT}/api/wallet`);
  console.log(`ℹ️  Run migrations manually with: npm run migrate`);

  console.log("\n📅 Initializing wallet schedulers...");
  initializeWalletScheduler();
  console.log("✅ Wallet scheduler initialized successfully!\n");
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

/* Handle unhandled promise rejections */
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(() => process.exit(1));
});
export default app;
