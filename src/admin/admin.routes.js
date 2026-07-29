import { Router } from "express";
import { protect, authorize } from "../common/middleware/auth.middleware.js";
import {
  getPendingHosts,
  verifyHost,
  getPendingListings,
  moderateListing,
  getAdminBookings,
  processManualRefund,
  getDisputes,
  handleResolveDispute,
  getAnalytics,
} from "./admin.controller.js";

const router = Router();

// Restrict all admin routes to administrative roles
router.use(protect, authorize("platform_admin", "admin"));

/* 
   Host Verification & Moderation Routes
    */

// GET /api/admin/hosts/pending
router.get("/hosts/pending", getPendingHosts);

// PATCH /api/admin/hosts/:userId/verify
router.patch("/hosts/:userId/verify", verifyHost);

/* 
   Workspace Listing Moderation Routes
    */

// GET /api/admin/workspaces/pending
router.get("/workspaces/pending", getPendingListings);

// PATCH /api/admin/workspaces/:workspaceId/status
router.patch("/workspaces/:workspaceId/status", moderateListing);

/* 
   Booking Monitoring & Financial Override Routes
    */

// GET /api/admin/bookings
router.get("/bookings", getAdminBookings);

// POST /api/admin/refunds
router.post("/refunds", processManualRefund);

/* 
   Dispute Management Routes
   */

// GET /api/admin/disputes
router.get("/disputes", getDisputes);

// PATCH /api/admin/disputes/:disputeId/resolve
router.patch("/disputes/:disputeId/resolve", handleResolveDispute);

/* 
   Platform Analytics & KPIs
  */
// GET /api/admin/analytics
router.get("/analytics", getAnalytics);

export default router;