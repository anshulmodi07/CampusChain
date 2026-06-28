// Its job is ONLY:
// Define URLs + attach middleware + call controller functions.

import express from "express";
import { createOrder } from "../controllers/payment.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Razorpay is a donation payment method, so restrict this action to donors.
// Keeping this here maintains SRP: controller handles gateway logic, router handles auth + wiring.
router.post(
  "/api/razorpay/create-order",
  verifyToken,
  requireRole("donor"),
  createOrder
);

export default router;

