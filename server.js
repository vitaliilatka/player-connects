// // server.js
// import express from "express";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import path from "path";
// import cors from "cors";
// import { fileURLToPath } from "url";

// import playersRouter from "./routes/players.js";
// import authRouter from "./routes/auth.js";
// import adminRoutes from "./routes/admin.js";
// import leaguesRouter from "./routes/leagues.js";
// import adminMatchesRouter from "./routes/adminMatches.js";
// import adminTeamSquadsRouter from "./routes/adminTeamSquads.js";

// import leaderboardRoutes from "./routes/leaderboard.js";
// import userRoutes from "./routes/user.js";
// import matchesRouter from "./routes/matches.js";

// // === Environment configuration ===
// dotenv.config();

// // === Initialize Express application ===
// const app = express();

// // === CORS ===
// app.use(cors({
//   origin: [
//     "http://localhost:3000",
//     "http://localhost:4000",
//     "http://localhost:5173",
//     "https://playerconnects.netlify.app"
//   ],
//   credentials: true
// }));

// // === __dirname for ES modules ===
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // === Middleware ===
// app.use(express.json());
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// app.set("strict routing", false);

// // === ROUTES ===

// // 🔥 ВАЖНО: правильный путь

// app.use("/admin/matches", adminMatchesRouter);
// app.use("/admin/teamsquads", adminTeamSquadsRouter);
// app.use("/admin", adminRoutes);

// // app.use("/admin/matches", adminMatchesRouter);


// // app.use("/admin", adminRoutes);

// // // остальные админские

// // app.use("/admin", adminTeamSquadsRouter);

// // публичные
// app.use("/players", playersRouter);
// app.use("/auth", authRouter);
// app.use("/leagues", leaguesRouter);
// app.use("/user", userRoutes);
// app.use("/leaderboard", leaderboardRoutes);
// app.use("/matches", matchesRouter);

// console.log("ADMIN MATCHES ROUTE LOADED");

// // === MongoDB ===
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("✅ Connected to MongoDB"))
//   .catch((err) => console.error("MongoDB connection error:", err));

// // === Static ===
// app.use(express.static(path.join(__dirname, "public")));

// // === Start ===
// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () =>
//   console.log(`🚀 Server running on http://localhost:${PORT}`)
// );
// ----------------------------------------------------------------------



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

import leaderboardRoutes from "./routes/leaderboard.js";

import userRoutes from "./routes/user.js";



import matchesRouter from "./routes/matches.js";



// === Environment configuration ===
dotenv.config();

// === Initialize Express application ===
const app = express();

// === CORS ===

app.use(cors());

// app.use(cors({
//   origin: function (origin, callback) {
//     const allowedOrigins = [
//       "http://localhost:3000",
//       "http://localhost:4000",
//       "http://localhost:5173",
//       "https://playerconnects.netlify.app",
//       "https://player-connects.onrender.com",
//       "https://player-connects-backend.onrender.com"
//     ];

//     // allow requests with no origin (like Postman)
//     if (!origin) return callback(null, true);

//     if (allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("CORS not allowed"));
//     }
//   },
//   credentials: true
// }));

// app.use(cors({
//   origin: [
//     "http://localhost:3000",
//     "http://localhost:4000",
//     "http://localhost:5173",
//     "https://playerconnects.netlify.app"
//   ],
//   credentials: true
// }));

console.log("CORS ENABLED");

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

app.use("/user", userRoutes);
app.use("/leaderboard", leaderboardRoutes);

app.use("/matches", matchesRouter);

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

