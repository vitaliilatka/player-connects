// routes/adminMatches.js
import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import TeamSquad from "../models/TeamSquad.js";
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
   POST /admin/matches
========================= */

router.post("/", authMiddleware("admin"), async (req, res) => {
  console.log("REQ BODY:", req.body);

  try {
    const { league, homeTeam, awayTeam, matchday } = req.body;

    if (!league || !homeTeam || !awayTeam || matchday == null) {
      return res.status(400).json({
        message: "league, homeTeam, awayTeam and matchday are required"
      });
    }

    const match = await Match.create({
      league,
      homeTeam,
      awayTeam,
      matchday,
      status: "draft",
      lineups: { home: [], away: [] },
      subsIn: { home: [], away: [] }
    });

    res.status(201).json(match);
  } catch (err) {
    console.error("Create match error:", err);
    res.status(400).json({ message: err.message });
  }
});

/* =========================
   POST /admin/matches/:matchId/lineup
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
        return res
          .status(400)
          .json({ message: `Player ${p.playerId} not in squad` });
      }
    }

    match.lineups[team] = players.map(p => ({
      player: new mongoose.Types.ObjectId(p.playerId),
      position: p.position,
    }));

    match.status = "confirmed";
    await match.save();

    res.json({
      message: "Lineup saved",
      team,
      playersCount: players.length,
    });
  } catch (err) {
    console.error("Lineup error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

