// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

import playersRouter from "./routes/players.js";
import authRouter from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import leaguesRouter from "./routes/leagues.js";
import adminMatchesRouter from "./routes/adminMatches.js";
import adminTeamSquadsRouter from "./routes/adminTeamSquads.js";



// === Environment configuration ===
dotenv.config();

// === Initialize Express application ===
const app = express();

// === CORS ===
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:4000",
    "http://localhost:5173",
    "https://playerconnects.netlify.app"
  ],
  credentials: true
}));

// === Emulate __dirname in ES Modules ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Middleware ===
app.use(express.json()); // <-- важно, до всех роутов
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// === Route registration ===
app.use("/players", playersRouter);
app.use("/auth", authRouter);
app.use("/leagues", leaguesRouter); // public routes
app.use("/admin/players", adminRoutes); // старый админ для игроков
app.use("/admin/matches", adminMatchesRouter); // новый админ для матчей
app.use("/admin", adminTeamSquadsRouter);

// === MongoDB connection ===
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// === Static files (must be LAST) ===
app.use(express.static(path.join(__dirname, "public")));

// === Start the server ===
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

