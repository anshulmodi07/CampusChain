// Its job is ONLY:
// Define URLs + attach middleware + call controller functions.

import express from "express";
import { createOrder, verifyPayment } from "../controllers/payment.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Razorpay is a donation payment method, so restrict these actions to donors.
// Keeping this here maintains SRP: controller handles gateway logic, router handles auth + wiring.
router.post(
  "/api/razorpay/create-order",
  verifyToken,
  requireRole("donor"),
  createOrder
);

router.post(
  "/api/razorpay/verify",
  verifyToken,
  requireRole("donor"),
  verifyPayment
);

export default router;


