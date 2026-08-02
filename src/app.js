import express from "express";
import cors from "cors";

// Route imports
import authRoutes from "./auth/auth.routes.js";
import workspaceRoutes from "./workspace/workspace.routes.js";
import bookingRoutes from "./booking/booking.routes.js";
import corporateRoutes from "./corporate/corporate.routes.js";
import adminRoutes from "./admin/admin.routes.js";
import paymentRoutes from "./payments/routes/payment.routes.js";
import supportRoutes from "./support/support.routes.js";
import favoritesRoutes from "./favorites/favorites.routes.js";
import searchRoutes from "./search/search.routes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/corporate", corporateRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/search", searchRoutes);

// Root
app.get("/", (req, res) => {
  res.send("Welcome to the SpaceShare API!");
});

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: true,
    message: "SpaceShare API is running!",
    timestamp: new Date().toISOString(),
  });
});

//404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
});

export default app;
