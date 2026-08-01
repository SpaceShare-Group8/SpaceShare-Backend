import express from "express";
import {
  saveSearch,
  getSearchHistory,
  clearSearchHistory,
} from "./search.controller.js";

import { protect } from "../common/middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/history", saveSearch);

router.get("/history", getSearchHistory);

router.delete("/history", clearSearchHistory);

export default router;
