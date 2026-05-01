import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import TeamSquad from "../models/TeamSquad.js";

import UserPrediction from "../models/UserPrediction.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

import Player from "../models/Player.js"; // ДОБАВЬ

const router = express.Router();

console.log("MATCHES ROUTER LOADED");

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

    if (p.position === "GK") gkCount++;
  }

  if (gkCount !== 1) return "Exactly one GK is required";

  return null;
}

/* =========================
   STRICT PREDICTION VALIDATION
========================= */
function validatePrediction({
  players,
  subs,
  goals,
  predictedScore,
  team,
  squadPlayers,
  motm,
  missedPenalties = []
}) {

  if (!predictedScore)
    return "Predicted score is required";

  if (predictedScore.home < 0 || predictedScore.away < 0)
    return "Score cannot be negative";

  if (subs.length > 5)
    return "Maximum 5 substitutions allowed";

  const lineupIds = players.map(p => p.playerId);
  const subIds = subs.map(s => s.playerId);

  if (new Set(subIds).size !== subIds.length)
    return "Duplicate substitute players are not allowed";

  for (const sub of subs) {
    if (!squadPlayers.includes(sub.playerId))
      return "Substitute player not in squad";
  }

  for (const subId of subIds) {
    if (lineupIds.includes(subId))
      return "Substitute player already in starting lineup";
  }

  const allowedPlayers = [...lineupIds, ...subIds];

  const expectedGoals = predictedScore.home + predictedScore.away;

  if (goals.length > expectedGoals)
    return `Too many goals`;

  for (const g of goals) {

    if (!g.scorer)
      return "Each goal must contain a scorer";

    if (!allowedPlayers.includes(g.scorer))
      return "Scorer must be in lineup or substitutes";

    if (g.assist) {
      if (g.assist === g.scorer)
        return "Player cannot assist himself";

      if (!allowedPlayers.includes(g.assist))
        return "Assist player must be in lineup or substitutes";
    }
  }

  if (motm && !allowedPlayers.includes(motm))
    return "MOTM must be from lineup or substitutes";

  return null;
}

/* =========================
   POST PREDICT LINEUP
========================= */
router.post("/:matchId/predict-lineup", authMiddleware(), async (req, res) => {
  try {

    console.log("📩 BODY:");
    console.log(JSON.stringify(req.body, null, 2));

    const { matchId } = req.params;
    const {
      team, // теперь это НАЗВАНИЕ команды
      players,
      subs = [],
      motm = null,
      goals = [],
      predictedScore,
      missedPenalties = []
    } = req.body;

    const userId = req.user.id;

    const lineupError = validateLineup(players);
    if (lineupError)
      return res.status(400).json({ message: lineupError });

    const match = await Match.findById(matchId);
    if (!match)
      return res.status(404).json({ message: "Match not found" });

    if (match.status !== "draft")
      return res.status(400).json({ message: "Predictions closed" });

    const now = new Date();
    const deadline = new Date(match.kickoff.getTime() - 90 * 60 * 1000);

    if (now >= deadline)
      return res.status(400).json({
        message: "Prediction deadline passed"
      });

    // ✅ ВАЖНО: теперь просто используем имя команды

    let teamName;

    if (team === "home") {
      teamName = match.homeTeam;
    } else if (team === "away") {
      teamName = match.awayTeam;
    } else {
      return res.status(400).json({ message: "Invalid team side" });
    }

    console.log("TEAM SIDE:", team);
    console.log("TEAM NAME:", teamName);

    // ✅ ПРОСТО ИЩЕМ ИГРОКОВ ПО КОМАНДЕ
    const squadPlayersDocs = await Player.find({
      team: teamName
    });

    if (!squadPlayersDocs.length) {
      return res.status(404).json({ message: "Players not found for team" });
    }

    const squadPlayers = squadPlayersDocs.map(p => p._id.toString());

    const validationError = validatePrediction({
      players,
      subs,
      goals,
      predictedScore,
      team,
      squadPlayers,
      motm,
      missedPenalties
    });

    if (validationError)
      return res.status(400).json({ message: validationError });

    const prediction = await UserPrediction.findOneAndUpdate(
      { user: userId, match: matchId, team },
      {
        user: userId,
        match: matchId,
        matchday: match.matchday,
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
        missedPenalties,
        predictedScore,
        motm: motm ? new mongoose.Types.ObjectId(motm) : null,
        deadline,
        points: 0
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Prediction saved",
      deadline: prediction.deadline
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

