// create the app
// attach middleware
// attach routes
// export the app


import express from "express";
import cors from "cors";//Allows frontend ↔ backend communication
import db from "./db/index.js";



// [Why these are needed][below]
// Because you’re using ES Modules (import):
// __dirname does NOT exist by default
// These lines recreate it manually
import path from "path";
import { fileURLToPath } from "url";
import errorMiddleware from "./middlewares/error.middleware.js";


// Each file exports an Express Router
import authRoutes from "./routes/auth.routes.js";
import fundraiserRoutes from "./routes/fundraiser.routes.js";
import donationRoutes from "./routes/donation.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import profileRoutes from "./routes/profile.routes.js";

// create app FIRST
const app = express();

// global middleware
app.use(cors());
//json to js object middleware
app.use(express.json());

// __dirname setup (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Serve HTML/CSS/JS from /frontend
// Allows browser to load files directly
// app.use(express.static(path.join(__dirname, "../frontend")));

// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "../frontend/index.html"));
// });


// routes (AFTER app is created)
// Contains routes like /login, /api/donate, etc.
// Express attaches them to the app

app.get("/test-db", (req, res) => {
  db.query("SELECT 1", (err) => {
    if (err) {
      console.error("DB test failed:", err);
      return res.status(500).send("DB ERROR");
    }
    res.send("DB OK");
  });
});
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "CampusChain Backend" });
});


app.use(profileRoutes);
app.use(authRoutes);
app.use(fundraiserRoutes);
app.use(donationRoutes);
app.use(commentRoutes);
app.use(errorMiddleware);
export default app;


