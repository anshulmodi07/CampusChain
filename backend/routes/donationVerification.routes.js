// Its job is ONLY:
// Define URLs + attach middleware + call controller functions.

import express from "express";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";
import { verifyDonationProof } from "../controllers/donationVerification.controller.js";

const router = express.Router();

// WHY: Donor must be authenticated and restricted to their own donations.
router.get(
  "/api/donation/:donationId/verify",
  verifyToken,
  requireRole("donor"),
  verifyDonationProof
);

export default router;

