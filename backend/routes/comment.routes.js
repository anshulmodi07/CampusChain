// This file defines comment-related routes.
// Its job is ONLY:
// Define URLs
// Attach middleware
// Call controller functions
// Routes = URL + method + middleware + controller



import express from "express";
import { addComment, getComments, deleteComment } from "../controllers/comment.controller.js";
// 3️⃣ Import middleware
import { verifyToken } from "../middlewares/auth.middleware.js";


// This creates a mini Express app.
// Think of it as:
// “A small route container for comments.”
// Later this router is plugged into main app:
const router = express.Router();

router.post("/api/comment", verifyToken, addComment);
router.get("/api/comments/:id", getComments);
router.delete("/api/comments/:commentId", verifyToken, deleteComment);

export default router;
