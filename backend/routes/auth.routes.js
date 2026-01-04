// Its job is ONLY:
// Define URLs
// Attach middleware
// Call controller functions
// Routes = URL + method + middleware + controller


import express from "express";
import { signup, login } from "../controllers/auth.controller.js";
import wrapAsync from "../utils/wrapAsync.js";


const router = express.Router();

// auth routes
router.post("/signup", wrapAsync(signup));
router.post("/login", wrapAsync(login));

export default router;
