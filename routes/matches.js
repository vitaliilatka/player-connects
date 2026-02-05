// routes/matches.js
import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import TeamSquad from "../models/TeamSquad.js";
import UserPrediction from "../models/UserPrediction.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /matches/:matchId
 * public
 */
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

/**
 * POST /matches/:matchId/predict-lineup
 * user и admin могут делать прогноз
 */
router.post("/:matchId/predict-lineup", authMiddleware(), async (req, res) => {
  try {
    const { matchId } = req.params;
    const { team, players } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    if (!["user", "admin"].includes(role)) {
      return res.status(403).json({ message: "Only authorized users can make predictions" });
    }

    if (!["home", "away"].includes(team)) {
      return res.status(400).json({ message: "Invalid team value" });
    }

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ message: "Players array is required" });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (match.status !== "draft") {
      return res.status(400).json({ message: "Predictions are closed" });
    }

    // Определяем команду
    const teamName = team === "home" ? match.homeTeam : match.awayTeam;

    const squad = await TeamSquad.findOne({ team: teamName });
    if (!squad) {
      return res.status(404).json({ message: "Team squad not found" });
    }

    // Приводим squad.players к строкам ОДИН РАЗ
    const squadPlayerIds = squad.players.map(p => p.toString());

    for (const p of players) {
      if (!p.playerId || !p.position) {
        return res.status(400).json({ message: "Each player must have playerId and position" });
      }

      if (!squadPlayerIds.includes(p.playerId)) {
        return res.status(400).json({
          message: `Player ${p.playerId} not in squad`
        });
      }
    }

    const prediction = await UserPrediction.findOneAndUpdate(
      { user: userId, match: matchId, team },
      {
        user: userId,
        match: matchId,
        team,
        players: players.map(p => ({
          player: new mongoose.Types.ObjectId(p.playerId),
          position: p.position
        }))
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Prediction saved",
      predictionId: prediction._id
    });
  } catch (err) {
    console.error("Prediction error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /matches/:matchId/predictions
 * public (можно закрыть позже)
 */
router.get("/:matchId/predictions", async (req, res) => {
  try {
    const { matchId } = req.params;

    const predictions = await UserPrediction.find({ match: matchId })
      .populate("user", "username role")
      .populate("players.player", "name");

    res.json({
      matchId,
      total: predictions.length,
      predictions
    });
  } catch (err) {
    console.error("Get predictions error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;


// -----------------------------------------------------------

// // routes/matches.js
// import express from "express";
// import mongoose from "mongoose";
// import Match from "../models/Match.js";
// import TeamSquad from "../models/TeamSquad.js";
// import UserPrediction from "../models/UserPrediction.js";
// import { authMiddleware } from "../middleware/authMiddleware.js";

// const router = express.Router();

// /**
//  * GET /matches/:matchId
//  * public
//  */
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


// /**
//  * POST /matches/:matchId/predict-lineup
//  * Пользователь или админ делает прогноз стартового состава
//  */
// router.post("/:matchId/predict-lineup", authMiddleware(), async (req, res) => {
//   const { matchId } = req.params;
//   const { team, players } = req.body;
//   const userId = req.user.id;

//   if (!["user", "admin"].includes(req.user.role)) {
//     return res.status(403).json({ message: "Only users can make predictions" });
//   }

//   if (!["home", "away"].includes(team)) {
//     return res.status(400).json({ message: "Invalid team" });
//   }

//   if (!Array.isArray(players) || players.length === 0) {
//     return res.status(400).json({ message: "Players array is required" });
//   }

//   try {
//     // Находим матч
//     const match = await Match.findById(matchId);
//     if (!match) return res.status(404).json({ message: "Match not found" });

//     if (match.status !== "draft") {
//       return res.status(400).json({ message: "Predictions are closed" });
//     }

//     // Находим состав команды
//     const teamName = team === "home" ? match.homeTeam : match.awayTeam;
//     const squad = await TeamSquad.findOne({ team: teamName });
//     if (!squad) return res.status(404).json({ message: "Team squad not found" });

//     // Проверка игроков
//     for (const p of players) {
//       if (!squad.players.some(id => id.toString() === p.playerId)) {
//         return res.status(400).json({ message: `Player ${p.playerId} not in squad` });
//       }
//     }

//     // Сохраняем или обновляем в отдельной коллекции UserPrediction
//     await UserPrediction.findOneAndUpdate(
//       { user: userId, match: matchId, team },
//       {
//         user: userId,
//         match: matchId,
//         team,
//         players: players.map(p => ({
//           player: new mongoose.Types.ObjectId(p.playerId),
//           position: p.position
//         }))
//       },
//       { upsert: true, new: true }
//     );

//     res.json({ message: "Prediction saved", team, playersCount: players.length });
//   } catch (err) {
//     console.error("Prediction error:", err);
//     res.status(500).json({ message: err.message });
//   }
// });

// export default router;

