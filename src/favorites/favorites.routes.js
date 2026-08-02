import express from "express";
import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
} from "./favorites.controller.js";

import { protect } from "../common/middleware/auth.middleware.js";

const router = express.Router();

/**
 * All favorite routes require authentication
 */
router.use(protect);

/**
 * GET /api/favorites
 * Get all favorite workspaces
 */
router.get("/", getUserFavorites);

/**
 * POST /api/favorites/:workspaceId
 * Add workspace to favorites
 */
router.post("/:workspaceId", addFavorite);

/**
 * DELETE /api/favorites/:workspaceId
 * Remove workspace from favorites
 */
router.delete("/:workspaceId", removeFavorite);

export default router;
