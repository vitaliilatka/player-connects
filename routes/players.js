import express from "express";
import Player from "../models/Player.js";
import { upload } from "../utils/uploadConfig.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ===========================================
   GET /players
   Get all players or players filtered by leagueId
=========================================== */
router.get("/", async (req, res) => {
  try {
    const query = {}; // optional filter by league

    if (req.query.leagueId) {
      query.league = req.query.leagueId;
    }

    console.log("leagueId =", req.query.leagueId);

    const players = await Player.find(query);
    res.json(players);

  } catch (err) {
    res.status(500).json({
      message: "Failed to load players",
      error: err.message
    });
  }
});

/* ===========================================
   GET /players/team/:team
   Get ALL players by team (🔥 ИСПРАВЛЕНО)
=========================================== */


router.get("/team/:team", async (req, res) => {
  try {
    const teamName = req.params.team.toLowerCase();

    console.log("GET PLAYERS BY TEAM:", teamName);

    const players = await Player.find({ team: teamName });

    res.json({
      count: players.length,
      players
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to load team players",
      error: err.message
    });
  }
});

export default router;

// router.get("/team/:team", async (req, res) => {
//   try {
//     const teamName = req.params.team;

//     console.log("GET PLAYERS BY TEAM:", teamName);

//     const players = await Player.find({ team: teamName });

//     res.json({
//       count: players.length,
//       players
//     });

//   } catch (err) {
//     res.status(500).json({
//       message: "Failed to load team players",
//       error: err.message
//     });
//   }
// });


