// Its job is ONLY:
// Define URLs
// Attach middleware
// Call controller functions
// Routes = URL + method + middleware + controller


import express from "express";
import {
  getAllFundraisers,
  getFundraiserById,
  createFundraiser,
  getMyFundraisers,
  getTotalRaised,
  updateFundraiserStatus,
  updateFundraiserDescription
} from "../controllers/fundraiser.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/api/fundraisers", getAllFundraisers);
router.get("/api/fundraiser/:id", getFundraiserById);
router.get("/api/raised/:id", getTotalRaised);
router.get("/api/my-fundraisers", verifyToken, requireRole("ngo"), getMyFundraisers);
router.post("/api/fundraiser/create", verifyToken, requireRole("ngo"), createFundraiser);
router.put("/api/fundraiser/:id/status", verifyToken, requireRole("ngo"), updateFundraiserStatus);
router.put("/api/fundraiser/:id/description", verifyToken, requireRole("ngo"), updateFundraiserDescription);

export default router;
