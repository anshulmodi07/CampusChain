// Its job is ONLY:
// Define URLs
// Attach middleware
// Call controller functions
// Routes = URL + method + middleware + controller


import express from "express";
import { updateProfile } from "../controllers/profile.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.put("/api/profile/update", verifyToken, updateProfile);

export default router;
