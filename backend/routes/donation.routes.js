// Its job is ONLY:
// Define URLs
// Attach middleware
// Call controller functions
// Routes = URL + method + middleware + controller

import express from "express";
import { donate, myDonations } from "../controllers/donation.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/api/donate", verifyToken, requireRole("donor"), donate);
router.get("/api/my-donations", verifyToken, requireRole("donor"), myDonations);

export default router;
