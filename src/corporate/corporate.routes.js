import { Router } from "express";
import { protect, authorize } from "../common/middleware/auth.middleware.js";
import {
  createAccount,
  updateCorporateBudget,
  inviteEmployee,
  getUsageReport,
} from "./corporate.controller.js";

const router = Router();

// Protect all corporate routes requiring authentication
router.use(protect);

// POST /api/corporate/accounts - Provision corporate account
router.post("/accounts", createAccount);

// PATCH /api/corporate/budget - Update corporate spending budget limits
router.patch("/budget", authorize("corporate_admin"), updateCorporateBudget);

// POST /api/corporate/employees - Dispatch employee invitation token link
router.post("/employees", authorize("corporate_admin"), inviteEmployee);

// GET /api/corporate/reports - Fetch corporate usage & spending analytics
router.get("/reports", authorize("corporate_admin"), getUsageReport);

export default router;