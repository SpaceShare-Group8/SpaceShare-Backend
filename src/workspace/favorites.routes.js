import { Router } from "express";
import { protect } from "../common/middleware/auth.middleware.js";

import {
  createFavorite,
  deleteFavorite,
  listFavorites,
} from "./favorites.controller.js";

const router = Router();

router.post("/:workspaceId", protect, createFavorite);

router.delete("/:workspaceId", protect, deleteFavorite);

router.get("/", protect, listFavorites);

export default router;
