import express from "express";
import {
  initiate,
  webhook,
} from "./payment.controller.js";

const router = express.Router();

router.post("/initiate", initiate);

router.post("/webhook", webhook);

export default router;
