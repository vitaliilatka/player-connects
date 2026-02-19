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
          assist: g.assist ? new mongoose.Types.ObjectId(g.assist) : null
        })),
        predictedScore,
        motm: motm ? new mongoose.Types.ObjectId(motm) : null,
        points: 0
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Prediction saved" });

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
    const match = await Match.findById(req.params.matchId);

    if (!match)
      return res.status(404).json({ message: "Match not found" });

    if (match.status !== "finished")
      return res.status(400).json({ message: "Match not finished yet" });

    const predictions = await UserPrediction.find({
      match: match._id
    }).populate("user", "username");

    const results = [];

    for (const pred of predictions) {
      let totalPoints = 0;

      /* =====================
         STARTING XI
      ===================== */
      const actualLineup = match.lineups[pred.team] || [];
      const predictedLineup = pred.players || [];

      let lineupCorrect = 0;

      predictedLineup.forEach(pp => {
        if (
          actualLineup.some(
            ap => ap.player.toString() === pp.player.toString()
          )
        ) lineupCorrect++;
      });

      let lineupPoints = lineupCorrect;
      if (lineupCorrect === 11) lineupPoints += 3;

      totalPoints += lineupPoints;

      /* =====================
         SUBSTITUTIONS
      ===================== */
      const actualSubs = match.subsIn[pred.team] || [];
      const predictedSubs = pred.subs || [];

      let subsCorrect = 0;

      predictedSubs.forEach(ps => {
        if (
          actualSubs.some(
            as => as.player.toString() === ps.player.toString()
          )
        ) subsCorrect++;
      });

      let subsPoints = subsCorrect;

      if (actualSubs.length > 0 && subsCorrect === actualSubs.length)
        subsPoints += 3;

      if (predictedSubs.length === actualSubs.length)
        subsPoints += 3;

      totalPoints += subsPoints;

      /* =====================
         GOALS
      ===================== */
      const actualGoals = match.events.goals[pred.team] || [];
      const predictedGoals = pred.goals || [];

      let goalsPoints = 0;

      predictedGoals.forEach(pg => {
        actualGoals.forEach(ag => {
          if (ag.scorer.toString() === pg.scorer.toString()) {
            goalsPoints += 3;

            if (
              ag.assist &&
              pg.assist &&
              ag.assist.toString() === pg.assist.toString()
            ) {
              goalsPoints += 3; // assist
              goalsPoints += 3; // link bonus
            }
          }
        });
      });

      totalPoints += goalsPoints;

      /* =====================
         SCORE
      ===================== */
      if (
        pred.predictedScore.home === match.score.home &&
        pred.predictedScore.away === match.score.away
      ) {
        totalPoints += 5;
      }

      /* =====================
         MOTM
      ===================== */
      if (
        match.events.motm &&
        pred.motm &&
        match.events.motm.toString() === pred.motm.toString()
      ) {
        totalPoints += 3;
      }

      pred.points = totalPoints;
      await pred.save();

      results.push({
        user: pred.user,
        totalPoints,
        breakdown: {
          lineup: lineupPoints,
          subs: subsPoints,
          goals: goalsPoints,
          score:
            pred.predictedScore.home === match.score.home &&
            pred.predictedScore.away === match.score.away
              ? 5
              : 0,
          motm:
            match.events.motm &&
            pred.motm &&
            match.events.motm.toString() === pred.motm.toString()
              ? 3
              : 0
        }
      });
    }

    res.json(results);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

