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
  const { team, players, subs = [], motm = null } = req.body;
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

  if (subs.length > 5) {
    return res.status(400).json({ message: "Max 5 subs allowed" });
  }

  try {
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    if (match.status !== "draft") {
      return res.status(400).json({ message: "Predictions are closed" });
    }

    const teamName = team === "home" ? match.homeTeam : match.awayTeam;
    const squad = await TeamSquad.findOne({ team: teamName });
    if (!squad) return res.status(404).json({ message: "Team squad not found" });

    // проверка старта
    for (const p of players) {
      if (!squad.players.some(id => id.toString() === p.playerId)) {
        return res.status(400).json({ message: `Player ${p.playerId} not in squad` });
      }
    }

    // проверка замен
    for (const s of subs) {
      if (!squad.players.some(id => id.toString() === s.playerId)) {
        return res.status(400).json({ message: `Sub ${s.playerId} not in squad` });
      }
    }

    if (motm && !squad.players.some(id => id.toString() === motm)) {
      return res.status(400).json({ message: "MOTM not in squad" });
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
        })),
        subs: subs.map(s => ({
          player: new mongoose.Types.ObjectId(s.playerId),
          minute: s.minute
        })),
        motm: motm ? new mongoose.Types.ObjectId(motm) : null,
        points: 0
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Prediction saved",
      players: prediction.players.length,
      subs: prediction.subs.length,
      motm: prediction.motm
    });
  } catch (err) {
    console.error("Prediction error:", err);
    res.status(500).json({ message: err.message });
  }
});



/**
 * GET /matches/:matchId/compare
 */

router.get("/:matchId/compare", async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("lineups.home.player", "name")
      .populate("subsIn.home.player", "name")
      .populate("events.motm", "name");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const lineupIds = match.lineups.home.map(p =>
      p.player._id.toString()
    );

    const subIds = match.subsIn.home.map(s =>
      s.player._id.toString()
    );

    const motmId = match.events.motm
      ? match.events.motm._id.toString()
      : null;

    const predictions = await UserPrediction.find({
      match: match._id,
      team: "home",
    })
      .populate("user", "username")
      .populate("players.player", "name")
      .populate("subs.player", "name")
      .populate("motm", "name");

    const results = predictions.map(pred => {
      let points = 0;

      /* ===== стартовый состав ===== */
      const players = pred.players.map(p => {
        const isCorrect = lineupIds.includes(p.player._id.toString());

        if (isCorrect) points += 1;

        return {
          player: p.player,
          position: p.position,
          isCorrect,
          points: isCorrect ? 1 : 0,
        };
      });

      const correctStarters = players.filter(p => p.isCorrect).length;
      const starterBonus = correctStarters === 11 ? 3 : 0;
        points += starterBonus;
        
        /* ===== замены ===== */
    const predictedSubIds = pred.subs.map(s =>
        s.player._id.toString()
    );

    let correctSubs = 0;

    const subs = pred.subs.map(s => {
        const isCorrect = subIds.includes(s.player._id.toString());

    if (isCorrect) {
        correctSubs += 1;
        points += 1;
    }

    return {
        player: s.player,
        isCorrect,
        points: isCorrect ? 1 : 0,
    };
    });

    /*
    БОНУС ТОЛЬКО ЕСЛИ:
    - есть замены в матче
    - количество совпадает
    - все угаданы
    */
    const subsBonus =
        subIds.length > 0 &&
        predictedSubIds.length === subIds.length &&
        correctSubs === subIds.length
            ? 3
            : 0;

    points += subsBonus;


      /* ===== MOTM ===== */
      let motmCorrect = false;
      if (motmId && pred.motm) {
        motmCorrect = pred.motm._id.toString() === motmId;
        if (motmCorrect) points += 3;
      }

      return {
        user: pred.user,
        totalPoints: points,

        starters: {
          players,
          bonus: starterBonus,
        },

        subs: {
          players: subs,
          bonus: subsBonus,
        },

        motm: {
          predicted: pred.motm,
          actual: match.events.motm,
          isCorrect: motmCorrect,
          points: motmCorrect ? 3 : 0,
        },
      };
    });

    res.json(results);
  } catch (err) {
    console.error("Compare error:", err);
    res.status(500).json({ message: err.message });
  }
});


export default router;

