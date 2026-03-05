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

  if (!["home", "away"].includes(team))
    return "Invalid team selection";

  if (subs.length > 5)
    return "Maximum 5 substitutions allowed";

  const lineupIds = players.map(p => p.playerId);
  const subIds = subs.map(s => s.playerId);

  if (new Set(subIds).size !== subIds.length)
    return "Duplicate substitute players are not allowed";

  // subs from squad
  for (const sub of subs) {
    if (!squadPlayers.includes(sub.playerId))
      return "Substitute player not in squad";
  }

  // subs not in lineup
  for (const subId of subIds) {
    if (lineupIds.includes(subId))
      return "Substitute player already in starting lineup";
  }

  const allowedPlayers = [...lineupIds, ...subIds];

  const expectedGoals = predictedScore[team];

  if (goals.length !== expectedGoals)
    return `Goals count (${goals.length}) does not match predicted score (${expectedGoals})`;

  /* =========================
     GOALS + PENALTY
  ========================= */

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

    if (g.penalty) {

      if (g.penalty.earnedBy &&
          !allowedPlayers.includes(g.penalty.earnedBy))
        return "Penalty earnedBy must be in lineup or substitutes";

      if (g.penalty.takenBy &&
          !allowedPlayers.includes(g.penalty.takenBy))
        return "Penalty takenBy must be in lineup or substitutes";

      // 🔒 Заглушка: позже проверим что это GK соперника
      if (g.penalty.savedBy &&
          !mongoose.Types.ObjectId.isValid(g.penalty.savedBy))
        return "Penalty savedBy must be valid player id";
    }
  }

  /* =========================
     MISSED PENALTIES
  ========================= */

  for (const mp of missedPenalties) {

    if (!mp.takenBy)
      return "Missed penalty must contain takenBy";

    if (!allowedPlayers.includes(mp.takenBy))
      return "Missed penalty taker must be in lineup or substitutes";

    if (mp.earnedBy &&
        !allowedPlayers.includes(mp.earnedBy))
      return "Missed penalty earnedBy must be in lineup or substitutes";

    // 🔒 Заглушка на соперника
    if (mp.savedBy &&
        !mongoose.Types.ObjectId.isValid(mp.savedBy))
      return "Missed penalty savedBy must be valid player id";
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
    const { matchId } = req.params;
    const {
      team,
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

    if (!match.kickoff)
      return res.status(400).json({ message: "Kickoff time not set by admin" });

    const now = new Date();
    const deadline = new Date(match.kickoff.getTime() - 90 * 60 * 1000);

    if (now >= deadline)
      return res.status(400).json({
        message: "Prediction deadline passed (90 minutes before kickoff)"
      });

    const teamName = team === "home" ? match.homeTeam : match.awayTeam;

    const squad = await TeamSquad.findOne({ team: teamName });
    if (!squad)
      return res.status(404).json({ message: "Team squad not found" });

    const squadPlayers = squad.players.map(id => id.toString());

    for (const p of players) {
      if (!squadPlayers.includes(p.playerId))
        return res.status(400).json({
          message: `Player ${p.playerId} not in squad`
        });
    }

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
            : null,
          penalty: g.penalty || null
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


/* =========================
   GET PREDICTIONS
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
   COMPARE (ADVANCED VERSION)
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

      /* =========================
         HELPER: PLAYER ACTIVE CHECK
      ========================= */

      const getPlayerInterval = (playerId) => {

        const startMinute = 0;
        const endMinute = 120;

        const subOut = match.substitutions?.[pred.team]?.find(
          s => s.playerOut?.toString() === playerId.toString()
        );

        const subIn = match.substitutions?.[pred.team]?.find(
          s => s.playerIn?.toString() === playerId.toString()
        );

        let from = startMinute;
        let to = endMinute;

        if (subIn) from = subIn.minute;
        if (subOut) to = subOut.minute;

        return { from, to };
      };

      const isActiveAtMinute = (playerId, minute) => {
        const { from, to } = getPlayerInterval(playerId);
        return minute >= from && minute <= to;
      };

      /* =========================
         LINEUP
      ========================= */

      const actualLineup = match.lineups?.[pred.team] || [];
      const predictedLineup = pred.players || [];

      let lineupCorrect = 0;

      predictedLineup.forEach(pp => {
        if (
          actualLineup.some(
            ap => ap.player.toString() === pp.player.toString()
          )
        ) lineupCorrect++;
      });

      let lineupBonus = lineupCorrect === 11 ? 3 : 0;
      let lineupPoints = lineupCorrect + lineupBonus;
      totalPoints += lineupPoints;

      /* =========================
         SUBSTITUTIONS
      ========================= */

      const actualSubs = match.substitutions?.[pred.team] || [];
      const predictedSubs = pred.subs || [];

      let subsCorrect = 0;

      predictedSubs.forEach(ps => {
        if (
          actualSubs.some(
            as => as.playerIn.toString() === ps.player.toString()
          )
        ) subsCorrect++;
      });

      let subsBonus = 0;

      if (
        predictedSubs.length === actualSubs.length &&
        subsCorrect === actualSubs.length &&
        actualSubs.length > 0
      ) {
        subsBonus = 3;
      }

      let subsPoints = subsCorrect + subsBonus;
      totalPoints += subsPoints;

      /* =========================
         GOALS + CONNECTS + MINUTES
      ========================= */

      const actualGoals = match.events?.goals?.[pred.team] || [];
      const predictedGoals = pred.goals || [];

      let scorerPoints = 0;
      let assistPoints = 0;
      let playerConnectBonus = 0;

      const usedActualGoals = new Set();

      predictedGoals.forEach(pg => {

        actualGoals.forEach((ag, index) => {

          if (usedActualGoals.has(index)) return;

          if (
            ag.scorer.toString() === pg.scorer.toString()
          ) {

            // Проверяем активность игрока
            if (!isActiveAtMinute(ag.scorer, ag.minute)) return;

            scorerPoints += 3;

            // ASSIST
            if (
              ag.assist &&
              pg.assist &&
              ag.assist.toString() === pg.assist.toString() &&
              isActiveAtMinute(ag.assist, ag.minute)
            ) {
              assistPoints += 3;
              playerConnectBonus += 3;
            }

            // PENALTY SELF CONNECT (earnedBy === takenBy)
            if (
              ag.penalty &&
              ag.penalty.earnedBy &&
              ag.penalty.takenBy &&
              ag.penalty.earnedBy.toString() ===
              ag.penalty.takenBy.toString() &&
              pg.scorer.toString() === ag.penalty.takenBy.toString()
            ) {
              playerConnectBonus += 3;
            }

            usedActualGoals.add(index);
          }

        });

      });

      let goalsPoints =
        scorerPoints + assistPoints + playerConnectBonus;

      totalPoints += goalsPoints;

      /* =========================
         SCORE
      ========================= */

      let scorePoints = 0;
      let exactScore = false;
      let homeGoalsCorrect = false;
      let awayGoalsCorrect = false;

      if (
        pred.predictedScore.home === match.score.home &&
        pred.predictedScore.away === match.score.away
      ) {
        scorePoints = 3;
        exactScore = true;
      } else {

        if (pred.predictedScore.home === match.score.home) {
          scorePoints += 2;
          homeGoalsCorrect = true;
        }

        if (pred.predictedScore.away === match.score.away) {
          scorePoints += 2;
          awayGoalsCorrect = true;
        }
      }

      totalPoints += scorePoints;

      /* =========================
         MOTM
      ========================= */

      let motmPoints = 0;
      let motmCorrect = false;

      if (
        match.events?.motm &&
        pred.motm &&
        match.events.motm.toString() === pred.motm.toString()
      ) {
        motmPoints = 3;
        motmCorrect = true;
        totalPoints += 3;
      }

      /* =========================
         SAVE
      ========================= */

      pred.points = totalPoints;
      await pred.save();

      results.push({
        user: pred.user,
        totalPoints,
        breakdown: {
          lineup: {
            correct: lineupCorrect,
            bonus: lineupBonus,
            points: lineupPoints
          },
          substitutions: {
            correct: subsCorrect,
            bonus: subsBonus,
            points: subsPoints
          },
          goals: {
            scorerPoints,
            assistPoints,
            playerConnectBonus,
            points: goalsPoints
          },
          score: {
            exactScore,
            homeGoalsCorrect,
            awayGoalsCorrect,
            points: scorePoints
          },
          motm: {
            correct: motmCorrect,
            points: motmPoints
          }
        }
      });
    }

    res.json(results);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

