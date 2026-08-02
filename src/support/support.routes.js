/**
 * Support Routes
 * Handles support ticket endpoints.
 */

import express from "express";
import { updateTicketStatus } from "./support.controller.js";
import { protect, authorize } from "../common/middleware/auth.middleware.js";

const router = express.Router();

/**
 * All support routes require authentication
 */
router.use(protect);

/**
 * PATCH /api/support/tickets/:id
 * Admin updates ticket status.
 */
router.patch("/tickets/:id", authorize("admin"), updateTicketStatus);

export default router;
