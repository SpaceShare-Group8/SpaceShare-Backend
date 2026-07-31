import { Router } from "express";

import {
  handleCreateAvailability,
  handleGetWorkspaceAvailability,
  handleUpdateAvailability,
  handleDeleteAvailability,
} from "./availability.controller.js";

import {
  protect,
  requireVerifiedHost,
} from "../../common/middleware/auth.middleware.js";

import {
  validateCreateAvailability,
  validateUpdateAvailability,
} from "./availability.validation.js";

const router = Router();

/**
 * POST /api/workspaces/:workspaceId/availability
 */
router.post(
  "/:workspaceId/availability",
  protect,
  requireVerifiedHost,
  validateCreateAvailability,
  handleCreateAvailability
);

/**
 * GET /api/workspaces/:workspaceId/availability
 */
router.get(
  "/:workspaceId/availability",
  handleGetWorkspaceAvailability
);

/**
 * PATCH /api/availability/:id
 */
router.patch(
  "/:id",
  protect,
  requireVerifiedHost,
  validateUpdateAvailability,
  handleUpdateAvailability
);

/**
 * DELETE /api/availability/:id
 */
router.delete(
  "/:id",
  protect,
  requireVerifiedHost,
  handleDeleteAvailability
);

export default router;