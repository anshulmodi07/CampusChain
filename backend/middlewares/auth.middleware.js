// verifyToken → “Is the user logged in?”
// requireRole → “Is the user allowed?”

import jwt from "jsonwebtoken";
import ExpressError from "../utils/ExpressError.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

// 🔐 AUTHENTICATION
export function verifyToken(req, res, next) {
  let token = req.headers.authorization;

  // 1️⃣ No token
  if (!token) {
    throw new ExpressError(401, "No token provided");
  }

  // 2️⃣ Remove Bearer prefix
  if (token.startsWith("Bearer ")) {
    token = token.slice(7);
  }

  // 3️⃣ Verify JWT
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      throw new ExpressError(401, "Invalid or expired token");
    }

    // 4️⃣ Attach user info to request
    req.user = decoded;

    next();
  });
}

// 🚦 AUTHORIZATION
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      throw new ExpressError(401, "User not authenticated");
    }

    if (req.user.role !== role) {
      throw new ExpressError(403, "Forbidden: insufficient permissions");
    }

    next();
  };
}
