import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import TeamSquad from "../models/TeamSquad.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * POST /admin/matches/:matchId/lineup
 * body:
 * {
 *   team: "home" | "away",
 *   players: [
 *     { playerId: "...", position: "gk" }
 *   ]
 * }
 */
router.post(
  "/:matchId/lineup",
  authMiddleware("admin"),
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { team, players } = req.body;

      if (!["home", "away"].includes(team)) {
        return res.status(400).json({ message: "Invalid team value" });
      }

      if (!Array.isArray(players) || players.length === 0) {
        return res.status(400).json({ message: "Players array required" });
      }

      const match = await Match.findById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      const teamName = team === "home" ? match.homeTeam : match.awayTeam;

      const squad = await TeamSquad.findOne({ team: teamName });
      if (!squad) {
        return res.status(404).json({ message: "Team squad not found" });
      }

      // проверка, что игроки есть в squad
      for (const p of players) {
        if (!squad.players.some(id => id.toString() === p.playerId)) {
          return res.status(400).json({
            message: `Player ${p.playerId} not in squad`
          });
        }
      }

      // сохраняем lineup
      match.lineups[team] = players.map(p => ({
        player: new mongoose.Types.ObjectId(p.playerId),
        position: p.position,
        fromMinute: 0
      }));

      await match.save();

      res.json({
        message: `Lineup for ${team} saved`,
        lineup: match.lineups[team]
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;

