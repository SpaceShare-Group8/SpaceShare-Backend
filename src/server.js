/* Module imports */
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

/* Route imports */
import authRoutes from "./auth/auth.routes.js";
import workspaceRoutes from "./workspace/workspace.routes.js";
import bookingRoutes from "./booking/booking.routes.js";
import corporateRoutes from "./corporate/corporate.routes.js";
import adminRoutes from "./admin/admin.routes.js";
import paymentRoutes from './payment/payment.routes.js';
import walletRoutes from './wallet/wallet.routes.js';

/* Scheduler imports */
import { initializeWalletScheduler } from './wallet/wallet.scheduler.js';

/* Load environment variables */
dotenv.config();

// ================================================================
// APPLICATION SETUP
// ================================================================

const app = express();

/* Middleware configuration */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Express route mounting */
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/corporate", corporateRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);

/* Root and health endpoints */
app.get("/", (req, res) => {
  res.send("Welcome to the SpaceShare API!");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: true,
    message: "Spaceshare API is running!",
    timestamp: new Date().toISOString(),
  });
});

/* Catch 404 routes */
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found.`,
  });
});

/* Global error handling middleware */
app.use((err, req, res, next) => {
  console.error("Global error caught:", err);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ================================================================
// SERVER STARTUP
// ================================================================

const PORT = process.env.PORT || 5000;

/* Start the server */
const server = app.listen(PORT, () => {
  console.log(`🚀 SpaceShare API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`💰 Wallet routes available at: http://localhost:${PORT}/api/wallet`);
  console.log(`ℹ️  Run migrations manually with: npm run migrate`);
  
  /* Initialize wallet schedulers after server starts */
  console.log('\n📅 Initializing wallet schedulers...');
  initializeWalletScheduler();
  console.log('✅ Wallet scheduler initialized successfully!\n');
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

// ================================================================
// EXPORTS
// ================================================================

export default app;