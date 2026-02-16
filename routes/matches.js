import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import TeamSquad from "../models/TeamSquad.js";
import UserPrediction from "../models/UserPrediction.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   VALIDATE LINEUP
========================= */
function validateLineup(players) {
  if (!Array.isArray(players)) return "Players must be an array";
  if (players.length !== 11) return "Lineup must contain exactly 11 players";

  const ids = new Set();
  let gkCount = 0;

  for (const p of players) {
    if (!p.playerId || !p.position)
      return "Each player must have playerId and position";

    if (ids.has(p.playerId))
      return "Duplicate players are not allowed";

    ids.add(p.playerId);

    if (p.position === "gk") gkCount++;
  }

  if (gkCount !== 1) return "Exactly one GK is required";

  return null;
}

/* =========================
   POST PREDICT LINEUP
========================= */
router.post("/:matchId/predict-lineup", authMiddleware(), async (req, res) => {
  try {
    const { matchId } = req.params;
    const {
      team,
      players,
      subs = [],
      motm = null,
      goals = [],
      predictedScore = { home: 0, away: 0 }
    } = req.body;

    const userId = req.user.id;

    const validationError = validateLineup(players);
    if (validationError)
      return res.status(400).json({ message: validationError });

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    if (match.status !== "draft")
      return res.status(400).json({ message: "Predictions closed" });

    const teamName = team === "home" ? match.homeTeam : match.awayTeam;
    const squad = await TeamSquad.findOne({ team: teamName });
    if (!squad)
      return res.status(404).json({ message: "Team squad not found" });

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
          minute: s.minute || null
        })),

        goals: goals.map(g => ({
          scorer: new mongoose.Types.ObjectId(g.scorer),
          assist: g.assist
            ? new mongoose.Types.ObjectId(g.assist)
            : null
        })),

        predictedScore,

        motm: motm
          ? new mongoose.Types.ObjectId(motm)
          : null,

        points: 0
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Prediction saved",
      goals: prediction.goals.length,
      score: prediction.predictedScore
    });

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
   COMPARE
========================= */
router.get("/:matchId/compare", async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("lineups.home.player", "name")
      .populate("subsIn.home.player", "name")
      .populate("events.goals.home.scorer", "name")
      .populate("events.goals.home.assist", "name")
      .populate("events.motm", "name");

    if (!match)
      return res.status(404).json({ message: "Match not found" });

    const predictions = await UserPrediction.find({
      match: match._id
    })
      .populate("user", "username")
      .populate("goals.scorer", "name")
      .populate("goals.assist", "name")
      .populate("motm", "name");

    const results = [];

    for (const pred of predictions) {
      let totalPoints = 0;

      /* =====================
         GOALS
      ===================== */
      const actualGoals = match.events.goals[pred.team] || [];
      const predictedGoals = pred.goals || [];

      let goalsPoints = 0;

      const goalResults = predictedGoals.map(pg => {
        let scorerCorrect = false;
        let assistCorrect = false;
        let linkCorrect = false;

        actualGoals.forEach(ag => {
          if (ag.scorer._id.toString() === pg.scorer._id.toString()) {
            scorerCorrect = true;

            if (
              ag.assist &&
              pg.assist &&
              ag.assist._id.toString() === pg.assist._id.toString()
            ) {
              assistCorrect = true;
              linkCorrect = true;
            }
          }
        });

        if (scorerCorrect) goalsPoints += 3;
        if (assistCorrect) goalsPoints += 3;
        if (linkCorrect) goalsPoints += 3;

        return {
          scorer: pg.scorer,
          assist: pg.assist,
          scorerCorrect,
          assistCorrect,
          linkCorrect
        };
      });

      totalPoints += goalsPoints;

      /* =====================
         SCORE
      ===================== */
      const scoreCorrect =
        pred.predictedScore.home === match.score.home &&
        pred.predictedScore.away === match.score.away;

      if (scoreCorrect) totalPoints += 5;

      /* =====================
         SAVE
      ===================== */
      pred.points = totalPoints;
      await pred.save();

      results.push({
        user: pred.user,
        totalPoints,
        goals: goalResults,
        score: {
          predicted: pred.predictedScore,
          actual: match.score,
          correct: scoreCorrect
        }
      });
    }

    res.json(results);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
