// routes/adminMatches.js
import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import TeamSquad from "../models/TeamSquad.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { processMatch } from "../services/matchProcessor.js";

const router = express.Router();

/* =========================
   HELPERS
========================= */

function validateLineup(players) {
  if (!Array.isArray(players)) return "Players must be an array";
  if (players.length !== 11) return "Lineup must contain exactly 11 players";

  const ids = new Set();
  let gkCount = 0;

  for (const p of players) {
    if (!p.playerId || !p.position) {
      return "Each player must have playerId and position";
    }

    const pos = p.position.toUpperCase();

    if (ids.has(p.playerId)) return "Duplicate players are not allowed";
    ids.add(p.playerId);

    if (pos === "GK") gkCount++;
  }

  if (gkCount !== 1) return "Exactly one GK is required";

  return null;
}

/* =========================
   CREATE MATCH
========================= */

router.post("/", authMiddleware("admin"), async (req, res) => {
  try {
    const { league, homeTeam, awayTeam, matchday, kickoff } = req.body;

    if (!league || !homeTeam || !awayTeam || matchday == null || !kickoff) {
      return res.status(400).json({
        message: "league, homeTeam, awayTeam, matchday and kickoff are required"
      });
    }

    const match = await Match.create({
      league,
      homeTeam,
      awayTeam,
      matchday,
      kickoff: new Date(kickoff),
      status: "scheduled"
    });

    res.status(201).json(match);
  } catch (err) {
    console.error("Create match error:", err);
    res.status(400).json({ message: err.message });
  }
});

/* =========================
   SAVE LINEUP → MATCH BECOMES LIVE
   И открываем следующий тур
========================= */

router.post("/:matchId/lineup", authMiddleware("admin"), async (req, res) => {
  const { team, players } = req.body;

  if (!["home", "away"].includes(team)) {
    return res.status(400).json({ message: "Invalid team" });
  }

  const validationError = validateLineup(players);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const teamName = team === "home" ? match.homeTeam : match.awayTeam;
    const squad = await TeamSquad.findOne({ team: teamName });

    if (!squad) {
      return res.status(404).json({ message: "Team squad not found" });
    }

    for (const p of players) {
      if (!squad.players.some(id => id.toString() === p.playerId)) {
        return res.status(400).json({
          message: `Player ${p.playerId} not in squad`
        });
      }
    }

    match.lineups[team] = players.map(p => ({
      player: new mongoose.Types.ObjectId(p.playerId),
      position: p.position.toUpperCase()
    }));

    const wasLiveBefore = match.status === "live";

    match.status = "live";
    await match.save();

    /* =========================
       ОТКРЫВАЕМ СЛЕДУЮЩИЙ ТУР
       если это первый live матч тура
    ========================= */

    if (!wasLiveBefore) {
      const liveCount = await Match.countDocuments({
        league: match.league,
        matchday: match.matchday,
        status: "live"
      });

      if (liveCount === 1) {
        await Match.updateMany(
          {
            league: match.league,
            matchday: match.matchday + 1,
            status: "scheduled"
          },
          { $set: { status: "draft" } }
        );
      }
    }

    res.json({
      message: "Lineup saved",
      team,
      playersCount: players.length
    });

  } catch (err) {
    console.error("Lineup error:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   SAVE RESULT
========================= */

router.post("/:id/result", authMiddleware("admin"), async (req, res) => {
  try {
    const {
      team,
      subs = [],
      goals = [],
      missedPenalties = [],
      cards = [],
      motm = null,
      score
    } = req.body;

    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!["home", "away"].includes(team)) {
      return res.status(400).json({ message: "Invalid team" });
    }

    match.substitutions[team] = subs.map(s => ({
      minute: s.minute,
      playerOut: new mongoose.Types.ObjectId(s.playerOut),
      playerIn: new mongoose.Types.ObjectId(s.playerIn)
    }));

    match.events.goals[team] = goals.map(g => ({
      scorer: new mongoose.Types.ObjectId(g.scorer),
      assist: g.assist ? new mongoose.Types.ObjectId(g.assist) : null,
      minute: g.minute,
      ownGoal: g.ownGoal || false,
      penalty: {
        isPenalty: g.penalty?.isPenalty || false,
        earnedBy: g.penalty?.earnedBy
          ? new mongoose.Types.ObjectId(g.penalty.earnedBy)
          : null
      }
    }));

    match.events.missedPenalties[team] = missedPenalties.map(p => ({
      minute: p.minute,
      takenBy: new mongoose.Types.ObjectId(p.takenBy),
      earnedBy: p.earnedBy
        ? new mongoose.Types.ObjectId(p.earnedBy)
        : null
    }));

    match.events.cards[team] = cards.map(c => ({
      player: new mongoose.Types.ObjectId(c.player),
      type: c.type,
      minute: c.minute
    }));

    if (score) {
      match.score.home = score.home;
      match.score.away = score.away;
    }

    if (motm) {
      match.events.motm = new mongoose.Types.ObjectId(motm);
    }

    match.status = "finished";

    await match.save();
    await processMatch(match);

    res.json({ message: "Match result saved" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;


// -------------------------------------------------------------------------

// // routes/adminMatches.js
// import express from "express";
// import mongoose from "mongoose";
// import Match from "../models/Match.js";
// import TeamSquad from "../models/TeamSquad.js";
// import { authMiddleware } from "../middleware/authMiddleware.js";
// import { processMatch } from "../services/matchProcessor.js";

// const router = express.Router();

// /* =========================
//    HELPERS
// ========================= */

// function validateLineup(players) {
//   if (!Array.isArray(players)) {
//     return "Players must be an array";
//   }

//   if (players.length !== 11) {
//     return "Lineup must contain exactly 11 players";
//   }

//   const ids = new Set();
//   let gkCount = 0;

//   for (const p of players) {
//     if (!p.playerId || !p.position) {
//       return "Each player must have playerId and position";
//     }

//     const pos = p.position.toUpperCase();

//     if (ids.has(p.playerId)) {
//       return "Duplicate players are not allowed";
//     }

//     ids.add(p.playerId);

//     if (pos === "GK") {
//       gkCount++;
//     }
//   }

//   if (gkCount !== 1) {
//     return "Exactly one GK is required";
//   }

//   return null;
// }

// /* =========================
//    CREATE MATCH (SCHEDULE)
//    POST /admin/matches
// ========================= */

// router.post("/", authMiddleware("admin"), async (req, res) => {
//   try {
//     const {
//       league,
//       homeTeam,
//       awayTeam,
//       matchday,
//       kickoff // ISO date string
//     } = req.body;

//     if (!league || !homeTeam || !awayTeam || matchday == null || !kickoff) {
//       return res.status(400).json({
//         message: "league, homeTeam, awayTeam, matchday and kickoff are required"
//       });
//     }

//     const match = await Match.create({
//       league,
//       homeTeam,
//       awayTeam,
//       matchday,
//       kickoff: new Date(kickoff),
//       status: "scheduled",
//       score: { home: 0, away: 0 },
//       lineups: { home: [], away: [] },
//       substitutions: { home: [], away: [] },
//       events: {
//         goals: { home: [], away: [] },
//         missedPenalties: { home: [], away: [] },
//         cards: { home: [], away: [] },
//         motm: null
//       }
//     });

//     res.status(201).json(match);
//   } catch (err) {
//     console.error("Create match error:", err);
//     res.status(400).json({ message: err.message });
//   }
// });

// /* =========================
//    UPDATE MATCH DATE/TIME
//    PATCH /admin/matches/:id/schedule
// ========================= */

// router.patch("/:id/schedule", authMiddleware("admin"), async (req, res) => {
//   try {
//     const { kickoff, status } = req.body;

//     const match = await Match.findById(req.params.id);
//     if (!match) return res.status(404).json({ message: "Match not found" });

//     if (kickoff) {
//       match.kickoff = new Date(kickoff);
//     }

//     if (status && ["scheduled", "draft", "live", "finished"].includes(status)) {
//       match.status = status;
//     }

//     await match.save();

//     res.json({ message: "Match schedule updated", match });
//   } catch (err) {
//     console.error("Schedule update error:", err);
//     res.status(500).json({ message: err.message });
//   }
// });

// /* =========================
//    SAVE LINEUP
// ========================= */

// router.post("/:matchId/lineup", authMiddleware("admin"), async (req, res) => {
//   const { team, players } = req.body;

//   if (!["home", "away"].includes(team)) {
//     return res.status(400).json({ message: "Invalid team" });
//   }

//   const validationError = validateLineup(players);
//   if (validationError) {
//     return res.status(400).json({ message: validationError });
//   }

//   try {
//     const match = await Match.findById(req.params.matchId);
//     if (!match) return res.status(404).json({ message: "Match not found" });

//     const teamName = team === "home" ? match.homeTeam : match.awayTeam;
//     const squad = await TeamSquad.findOne({ team: teamName });

//     if (!squad) {
//       return res.status(404).json({ message: "Team squad not found" });
//     }

//     for (const p of players) {
//       if (!squad.players.some(id => id.toString() === p.playerId)) {
//         return res
//           .status(400)
//           .json({ message: `Player ${p.playerId} not in squad` });
//       }
//     }

//     match.lineups[team] = players.map(p => ({
//       player: new mongoose.Types.ObjectId(p.playerId),
//       position: p.position.toUpperCase()
//     }));

//     match.status = "live";

//     await match.save();

//     res.json({
//       message: "Lineup saved",
//       team,
//       playersCount: players.length
//     });
//   } catch (err) {
//     console.error("Lineup error:", err);
//     res.status(500).json({ message: err.message });
//   }
// });

// /* =========================
//    SAVE RESULT
// ========================= */

// router.post("/:id/result", authMiddleware("admin"), async (req, res) => {
//   try {
//     const {
//       team,
//       subs = [],
//       goals = [],
//       missedPenalties = [],
//       cards = [],
//       motm = null,
//       score
//     } = req.body;

//     const match = await Match.findById(req.params.id);
//     if (!match) {
//       return res.status(404).json({ message: "Match not found" });
//     }

//     if (!["home", "away"].includes(team)) {
//       return res.status(400).json({ message: "Invalid team" });
//     }

//     match.substitutions[team] = subs.map(s => ({
//       minute: s.minute,
//       playerOut: new mongoose.Types.ObjectId(s.playerOut),
//       playerIn: new mongoose.Types.ObjectId(s.playerIn)
//     }));

//     match.events.goals[team] = goals.map(g => ({
//       scorer: new mongoose.Types.ObjectId(g.scorer),
//       assist: g.assist ? new mongoose.Types.ObjectId(g.assist) : null,
//       minute: g.minute,
//       ownGoal: g.ownGoal || false,
//       penalty: {
//         isPenalty: g.penalty?.isPenalty || false,
//         earnedBy: g.penalty?.earnedBy
//           ? new mongoose.Types.ObjectId(g.penalty.earnedBy)
//           : null
//       }
//     }));

//     match.events.missedPenalties[team] = missedPenalties.map(p => ({
//       minute: p.minute,
//       takenBy: new mongoose.Types.ObjectId(p.takenBy),
//       earnedBy: p.earnedBy
//         ? new mongoose.Types.ObjectId(p.earnedBy)
//         : null
//     }));

//     match.events.cards[team] = cards.map(c => ({
//       player: new mongoose.Types.ObjectId(c.player),
//       type: c.type,
//       minute: c.minute
//     }));

//     if (score) {
//       match.score.home = score.home;
//       match.score.away = score.away;
//     }

//     if (motm) {
//       match.events.motm = new mongoose.Types.ObjectId(motm);
//     }

//     match.status = "finished";

//     await match.save();
//     await processMatch(match);

//     res.json({ message: "Match result saved" });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// });

// export default router;
