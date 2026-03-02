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
  motm
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

  // subs must be unique
  if (new Set(subIds).size !== subIds.length)
    return "Duplicate substitute players are not allowed";

  // subs must be from squad
  for (const sub of subs) {
    if (!squadPlayers.includes(sub.playerId))
      return "Substitute player not in squad";
  }

  // subs cannot duplicate lineup players
  for (const subId of subIds) {
    if (lineupIds.includes(subId))
      return "Substitute player already in starting lineup";
  }

  const allowedPlayers = [...lineupIds, ...subIds];

  const expectedGoals = predictedScore[team];

  if (goals.length !== expectedGoals)
    return `Goals count (${goals.length}) does not match predicted score (${expectedGoals})`;

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
    const { matchId } = req.params;
    const {
      team,
      players,
      subs = [],
      motm = null,
      goals = [],
      predictedScore
    } = req.body;

    const userId = req.user.id;

    /* LINEUP VALIDATION */
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

    /* TEAM + SQUAD CHECK */
    const teamName = team === "home" ? match.homeTeam : match.awayTeam;

    const squad = await TeamSquad.findOne({ team: teamName });
    if (!squad)
      return res.status(404).json({ message: "Team squad not found" });

    const squadPlayers = squad.players.map(id => id.toString());

    // lineup must be from squad
    for (const p of players) {
      if (!squadPlayers.includes(p.playerId))
        return res.status(400).json({
          message: `Player ${p.playerId} not in squad`
        });
    }

    /* STRICT VALIDATION */
    const validationError = validatePrediction({
      players,
      subs,
      goals,
      predictedScore,
      team,
      squadPlayers,
      motm
    });

    if (validationError)
      return res.status(400).json({ message: validationError });

    /* UPSERT */
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

// --------------------------------------------------------------------------------------

// import express from "express";
// import mongoose from "mongoose";
// import Match from "../models/Match.js";
// import TeamSquad from "../models/TeamSquad.js";
// import UserPrediction from "../models/UserPrediction.js";
// import { authMiddleware } from "../middleware/authMiddleware.js";

// const router = express.Router();

// /* =========================
//    VALIDATE LINEUP
// ========================= */
// function validateLineup(players) {
//   if (!Array.isArray(players)) return "Players must be an array";
//   if (players.length !== 11) return "Lineup must contain exactly 11 players";

//   const ids = new Set();
//   let gkCount = 0;

//   for (const p of players) {
//     if (!p.playerId || !p.position)
//       return "Each player must have playerId and position";

//     if (ids.has(p.playerId))
//       return "Duplicate players are not allowed";

//     ids.add(p.playerId);

//     if (p.position === "GK") gkCount++;
//   }

//   if (gkCount !== 1) return "Exactly one GK is required";

//   return null;
// }

// /* =========================
//    STRICT GOALS VALIDATION
// ========================= */
// function validatePredictedGoals(goals, predictedScore, team, lineupPlayers) {
//   if (!predictedScore)
//     return "Predicted score is required";

//   if (predictedScore.home < 0 || predictedScore.away < 0)
//     return "Score cannot be negative";

//   if (!["home", "away"].includes(team))
//     return "Invalid team selection";

//   const expectedGoals = predictedScore[team];

//   if (goals.length !== expectedGoals)
//     return `Goals count (${goals.length}) does not match predicted score (${expectedGoals})`;

//   const lineupIds = lineupPlayers.map(p => p.playerId);

//   for (const g of goals) {
//     if (!g.scorer)
//       return "Each goal must contain a scorer";

//     if (!lineupIds.includes(g.scorer))
//       return "Scorer must be in starting lineup";

//     if (g.assist) {
//       if (g.assist === g.scorer)
//         return "Player cannot assist himself";

//       if (!lineupIds.includes(g.assist))
//         return "Assist player must be in starting lineup";
//     }
//   }

//   return null;
// }

// /* =========================
//    POST PREDICT LINEUP
// ========================= */
// router.post("/:matchId/predict-lineup", authMiddleware(), async (req, res) => {
//   try {
//     const { matchId } = req.params;
//     const {
//       team,
//       players,
//       subs = [],
//       motm = null,
//       goals = [],
//       predictedScore
//     } = req.body;

//     const userId = req.user.id;

//     /* LINEUP VALIDATION */
//     const validationError = validateLineup(players);
//     if (validationError)
//       return res.status(400).json({ message: validationError });

//     const match = await Match.findById(matchId);
//     if (!match)
//       return res.status(404).json({ message: "Match not found" });

//     if (match.status !== "draft")
//       return res.status(400).json({ message: "Predictions closed" });

//     if (!match.kickoff)
//       return res.status(400).json({ message: "Kickoff time not set by admin" });

//     const now = new Date();
//     const deadline = new Date(match.kickoff.getTime() - 90 * 60 * 1000);

//     if (now >= deadline)
//       return res.status(400).json({
//         message: "Prediction deadline passed (90 minutes before kickoff)"
//       });

//     /* STRICT GOALS VALIDATION */
//     const goalsError = validatePredictedGoals(
//       goals,
//       predictedScore,
//       team,
//       players
//     );

//     if (goalsError)
//       return res.status(400).json({ message: goalsError });

//     /* TEAM + SQUAD CHECK */
//     const teamName = team === "home" ? match.homeTeam : match.awayTeam;

//     const squad = await TeamSquad.findOne({ team: teamName });
//     if (!squad)
//       return res.status(404).json({ message: "Team squad not found" });

//     for (const p of players) {
//       if (!squad.players.some(id => id.toString() === p.playerId))
//         return res.status(400).json({
//           message: `Player ${p.playerId} not in squad`
//         });
//     }

//     /* UPSERT */
//     const prediction = await UserPrediction.findOneAndUpdate(
//       { user: userId, match: matchId, team },
//       {
//         user: userId,
//         match: matchId,
//         team,
//         players: players.map(p => ({
//           player: new mongoose.Types.ObjectId(p.playerId),
//           position: p.position
//         })),
//         subs: subs.map(s => ({
//           player: new mongoose.Types.ObjectId(s.playerId),
//           minute: s.minute || null
//         })),
//         goals: goals.map(g => ({
//           scorer: new mongoose.Types.ObjectId(g.scorer),
//           assist: g.assist
//             ? new mongoose.Types.ObjectId(g.assist)
//             : null
//         })),
//         predictedScore,
//         motm: motm ? new mongoose.Types.ObjectId(motm) : null,
//         points: 0
//       },
//       { upsert: true, new: true }
//     );

//     res.json({ message: "Prediction saved" });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// /* =========================
//    GET PREDICTIONS
// ========================= */
// router.get("/:matchId/predictions", async (req, res) => {
//   try {
//     const predictions = await UserPrediction.find({
//       match: req.params.matchId,
//     })
//       .populate("user", "username")
//       .populate("players.player", "name rating");

//     res.json(predictions);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// /* =========================
//    COMPARE
// ========================= */
// router.get("/:matchId/compare", async (req, res) => {
//   try {
//     const match = await Match.findById(req.params.matchId);

//     if (!match)
//       return res.status(404).json({ message: "Match not found" });

//     if (match.status !== "finished")
//       return res.status(400).json({ message: "Match not finished yet" });

//     const predictions = await UserPrediction.find({
//       match: match._id
//     }).populate("user", "username");

//     const results = [];

//     for (const pred of predictions) {
//       let totalPoints = 0;

//       const actualLineup = match.lineups[pred.team] || [];
//       const predictedLineup = pred.players || [];

//       let lineupCorrect = 0;

//       predictedLineup.forEach(pp => {
//         if (
//           actualLineup.some(
//             ap => ap.player.toString() === pp.player.toString()
//           )
//         ) lineupCorrect++;
//       });

//       let lineupPoints = lineupCorrect;
//       if (lineupCorrect === 11) lineupPoints += 3;

//       totalPoints += lineupPoints;

//       const actualSubs = match.substitutions?.[pred.team] || [];
//       const predictedSubs = pred.subs || [];

//       let subsCorrect = 0;

//       predictedSubs.forEach(ps => {
//         if (
//           actualSubs.some(
//             as => as.playerIn.toString() === ps.player.toString()
//           )
//         ) subsCorrect++;
//       });

//       let subsPoints = subsCorrect;

//       if (actualSubs.length > 0 && subsCorrect === actualSubs.length)
//         subsPoints += 3;

//       if (predictedSubs.length === actualSubs.length)
//         subsPoints += 3;

//       totalPoints += subsPoints;

//       const actualGoals = match.events.goals[pred.team] || [];
//       const predictedGoals = pred.goals || [];

//       let goalsPoints = 0;

//       predictedGoals.forEach(pg => {
//         actualGoals.forEach(ag => {
//           if (ag.scorer.toString() === pg.scorer.toString()) {
//             goalsPoints += 3;

//             if (
//               ag.assist &&
//               pg.assist &&
//               ag.assist.toString() === pg.assist.toString()
//             ) {
//               goalsPoints += 6;
//             }
//           }
//         });
//       });

//       totalPoints += goalsPoints;

//       if (
//         pred.predictedScore.home === match.score.home &&
//         pred.predictedScore.away === match.score.away
//       ) {
//         totalPoints += 5;
//       }

//       if (
//         match.events.motm &&
//         pred.motm &&
//         match.events.motm.toString() === pred.motm.toString()
//       ) {
//         totalPoints += 3;
//       }

//       pred.points = totalPoints;
//       await pred.save();

//       results.push({
//         user: pred.user,
//         totalPoints
//       });
//     }

//     res.json(results);

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// export default router;
