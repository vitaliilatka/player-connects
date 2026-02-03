// routes/adminMatches.js
import express from "express";
import Match from "../models/Match.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import TeamSquad from "../models/TeamSquad.js";

import mongoose from "mongoose";

const router = express.Router();

/* =========================
   POST /admin
   Создание матча
========================= */
router.post("/", authMiddleware("admin"), async (req, res) => {
  try {
    const { league, matchday, homeTeam, awayTeam, startTime } = req.body;

    if (!league || !matchday || !homeTeam || !awayTeam) {
      return res.status(400).json({
        message: "league, matchday, homeTeam and awayTeam are required"
      });
    }

    const match = new Match({
      league,
      matchday,
      homeTeam,
      awayTeam,
      startTime: startTime || null,
      status: "draft",
      lineups: { home: [], away: [] },
      subsIn: { home: [], away: [] },
      events: { motm: null, goals: [] },
      predictedLineups: { home: [], away: [] }
    });

    await match.save();
    res.status(201).json(match);
  } catch (err) {
    console.error("Match creation error:", err);
    res.status(500).json({ message: "Failed to create match" });
  }
});

/* =========================
   POST /admin/matches/:matchId/lineup
   Ввод фактического стартового состава
========================= */
router.post("/:matchId/lineup", authMiddleware("admin"), async (req, res) => {
  try {
    const { matchId } = req.params;
    const { team, players } = req.body; // массив игроков { playerId, position }

    const ALLOWED_POSITIONS = ["gk", "def", "mid", "fw"];

    if (!team || !["home", "away"].includes(team)) {
      return res.status(400).json({ message: "team must be 'home' or 'away'" });
    }

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ message: "players array is required" });
    }

    // Проверяем, что все позиции верны
    for (const p of players) {
      if (!ALLOWED_POSITIONS.includes(p.position)) {
        return res.status(400).json({
          message: `Invalid position "${p.position}". Allowed: gk, def, mid, fw`
        });
      }
    }

    // // Проверяем, что игроки есть в TeamSquad для команды
    // const teamName = team === "home" ? req.body.homeTeam : req.body.awayTeam;
    // const squad = await TeamSquad.findOne({ team: teamName });
    // if (!squad) return res.status(404).json({ message: "Team squad not found" });

    // const squadPlayerIds = squad.players.map(p => p.toString());
    // const invalidPlayers = players.filter(p => !squadPlayerIds.includes(p.playerId));
    // if (invalidPlayers.length > 0) {
    //   return res.status(400).json({
    //     message: "Some players are not in the team squad",
    //     invalidPlayers
    //   });
    // }

    // // Находим матч
    // const match = await Match.findById(matchId);
    // if (!match) return res.status(404).json({ message: "Match not found" });
    

    // if (match.status !== "draft") {
    //   return res.status(400).json({ message: "Cannot edit lineup after match is started" });
    // }

    // Находим матч
const match = await Match.findById(matchId);
if (!match) return res.status(404).json({ message: "Match not found" });

if (match.status !== "draft") {
  return res.status(400).json({ message: "Cannot edit lineup after match is started" });
}

// Берём имя команды ИЗ МАТЧА
const teamName = team === "home" ? match.homeTeam : match.awayTeam;

// Ищем squad по реальному имени команды
const squad = await TeamSquad.findOne({ team: teamName });
if (!squad) {
  return res.status(404).json({ message: "Team squad not found", teamName });
}


    // Сохраняем состав
    match.lineups[team] = players.map(p => ({
      player:  mongoose.Types.ObjectId(p.playerId),
      position: p.position,
      fromMinute: 0
    }));

    await match.save();
    res.json({ message: `Lineup for ${team} saved`, lineup: match.lineups[team] });
  } catch (err) {
    console.error("Lineup save error:", err);
    res.status(500).json({ message: err.message || "Failed to save lineup" });
  }
});

/* =========================
   GET /admin
   Получить все матчи (для админа)
========================= */
router.get("/", authMiddleware("admin"), async (req, res) => {
  try {
    const matches = await Match.find().sort({ matchday: 1 });
    res.json(matches);
  } catch (err) {
    console.error("Match loading error:", err);
    res.status(500).json({ message: "Failed to load matches" });
  }
});

/* =========================
   GET /admin/:id
   Получить конкретный матч
========================= */
router.get("/:id", authMiddleware("admin"), async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });
    res.json(match);
  } catch (err) {
    console.error("Match load error:", err);
    res.status(500).json({ message: "Failed to load match" });
  }
});

export default router;

