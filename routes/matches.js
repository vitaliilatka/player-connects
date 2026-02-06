// routes/matches.js
import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import TeamSquad from "../models/TeamSquad.js";
import UserPrediction from "../models/UserPrediction.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   helpers
========================= */

function validateLineup(players) {
  if (!Array.isArray(players)) {
    return "Players must be an array";
  }

  if (players.length !== 11) {
    return "Lineup must contain exactly 11 players";
  }

  const ids = new Set();
  let gkCount = 0;

  for (const p of players) {
    if (!p.playerId || !p.position) {
      return "Each player must have playerId and position";
    }

    if (ids.has(p.playerId)) {
      return "Duplicate players are not allowed";
    }

    ids.add(p.playerId);

    if (p.position === "gk") {
      gkCount++;
    }
  }

  if (gkCount !== 1) {
    return "Exactly one GK is required";
  }

  return null;
}

/* =========================
   GET /matches/:matchId
========================= */
router.get("/:matchId", async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("league", "name")
      .populate("lineups.home.player", "name")
      .populate("lineups.away.player", "name");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET /matches/:matchId/predictions
========================= */
router.get("/:matchId/predictions", async (req, res) => {
  try {
    const predictions = await UserPrediction.find({
      match: req.params.matchId,
    })
      .populate("user", "username")
      .populate("players.player", "name rating");

    res.json(predictions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   POST /matches/:matchId/predict-lineup
========================= */
router.post("/:matchId/predict-lineup", authMiddleware(), async (req, res) => {
  const { matchId } = req.params;
  const { team, players } = req.body;
  const userId = req.user.id;

  if (!["user", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only users can make predictions" });
  }

  if (!["home", "away"].includes(team)) {
    return res.status(400).json({ message: "Invalid team" });
  }

  const validationError = validateLineup(players);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    if (match.status !== "draft") {
      return res.status(400).json({ message: "Predictions are closed" });
    }

    const teamName = team === "home" ? match.homeTeam : match.awayTeam;
    const squad = await TeamSquad.findOne({ team: teamName });

    if (!squad) {
      return res.status(404).json({ message: "Team squad not found" });
    }

    for (const p of players) {
      if (!squad.players.some(id => id.toString() === p.playerId)) {
        return res
          .status(400)
          .json({ message: `Player ${p.playerId} not in squad` });
      }
    }

    await UserPrediction.findOneAndUpdate(
      { user: userId, match: matchId, team },
      {
        user: userId,
        match: matchId,
        team,
        players: players.map(p => ({
          player: new mongoose.Types.ObjectId(p.playerId),
          position: p.position,
        })),
        points: 0,
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Prediction saved",
      team,
      playersCount: players.length,
    });
  } catch (err) {
    console.error("Prediction error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;


// ---------------------------------------------------------------------------

// // routes/matches.js
// import express from "express";
// import mongoose from "mongoose";
// import Match from "../models/Match.js";
// import TeamSquad from "../models/TeamSquad.js";
// import UserPrediction from "../models/UserPrediction.js";
// import { authMiddleware } from "../middleware/authMiddleware.js";

// const router = express.Router();

// /* =========================
//    HELPERS
// ========================= */

// const ALLOWED_FORMATIONS = [
//   "3-5-2",
//   "3-4-3",
//   "4-5-1",
//   "4-4-2",
//   "4-3-3",
//   "5-4-1",
//   "5-3-2",
// ];

// function validateLineup(players) {
//   if (players.length !== 11) {
//     return "Lineup must contain exactly 11 players";
//   }

//   const counts = {
//     GK: 0,
//     DEF: 0,
//     MID: 0,
//     FW: 0,
//   };

//   for (const p of players) {
//     if (!counts.hasOwnProperty(p.position)) {
//       return `Invalid position: ${p.position}`;
//     }
//     counts[p.position]++;
//   }

//   if (counts.GK !== 1) {
//     return "Lineup must contain exactly 1 GK";
//   }

//   if (counts.DEF < 3 || counts.DEF > 5) {
//     return "DEF must be between 3 and 5";
//   }

//   if (counts.MID < 3 || counts.MID > 5) {
//     return "MID must be between 3 and 5";
//   }

//   if (counts.FW < 1 || counts.FW > 3) {
//     return "FW must be between 1 and 3";
//   }

//   const formation = `${counts.DEF}-${counts.MID}-${counts.FW}`;
//   if (!ALLOWED_FORMATIONS.includes(formation)) {
//     return `Invalid formation: ${formation}`;
//   }

//   return null;
// }

// /* =========================
//    GET MATCH
// ========================= */

// router.get("/:matchId", async (req, res) => {
//   try {
//     const match = await Match.findById(req.params.matchId)
//       .populate("league", "name")
//       .populate("lineups.home.player", "name")
//       .populate("lineups.away.player", "name");

//     if (!match) {
//       return res.status(404).json({ message: "Match not found" });
//     }

//     res.json(match);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// /* =========================
//    POST PREDICT LINEUP
// ========================= */

// router.post(
//   "/:matchId/predict-lineup",
//   authMiddleware(),
//   async (req, res) => {
//     const { matchId } = req.params;
//     const { team, players } = req.body;
//     const userId = req.user.id;

//     if (!["user", "admin"].includes(req.user.role)) {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     if (!["home", "away"].includes(team)) {
//       return res.status(400).json({ message: "Invalid team" });
//     }

//     if (!Array.isArray(players)) {
//       return res.status(400).json({ message: "Players array is required" });
//     }

//     const validationError = validateLineup(players);
//     if (validationError) {
//       return res.status(400).json({ message: validationError });
//     }

//     try {
//       const match = await Match.findById(matchId);
//       if (!match) {
//         return res.status(404).json({ message: "Match not found" });
//       }

//       if (match.status !== "draft") {
//         return res.status(400).json({ message: "Predictions are closed" });
//       }

//       const teamName = team === "home" ? match.homeTeam : match.awayTeam;
//       const squad = await TeamSquad.findOne({ team: teamName });

//       if (!squad) {
//         return res.status(404).json({ message: "Team squad not found" });
//       }

//       // проверка игроков на принадлежность составу
//       for (const p of players) {
//         if (!squad.players.some(id => id.toString() === p.playerId)) {
//           return res.status(400).json({
//             message: `Player ${p.playerId} not in squad`,
//           });
//         }
//       }

//       await UserPrediction.findOneAndUpdate(
//         { user: userId, match: matchId, team },
//         {
//           user: userId,
//           match: matchId,
//           team,
//           players: players.map(p => ({
//             player: new mongoose.Types.ObjectId(p.playerId),
//             position: p.position,
//           })),
//           points: 0,
//         },
//         { upsert: true, new: true }
//       );

//       res.json({
//         message: "Prediction saved",
//         team,
//         formation: `${players.filter(p => p.position === "DEF").length}-${
//           players.filter(p => p.position === "MID").length
//         }-${players.filter(p => p.position === "FW").length}`,
//       });
//     } catch (err) {
//       console.error("Prediction error:", err);
//       res.status(500).json({ message: err.message });
//     }
//   }
// );

// /* =========================
//    GET MATCH PREDICTIONS
// ========================= */

// router.get("/:matchId/predictions", async (req, res) => {
//   try {
//     const predictions = await UserPrediction.find({
//       match: req.params.matchId,
//     })
//       .populate("user", "username")
//       .populate("players.player", "name");

//     res.json(predictions);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// export default router;
