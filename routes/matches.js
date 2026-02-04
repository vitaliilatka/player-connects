import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import TeamSquad from "../models/TeamSquad.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * POST /matches/:matchId/predict-lineup
 */
router.post(
  "/:matchId/predict-lineup",
  authMiddleware(), 
    async (req, res) => {
      if (!["user", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only users can make predictions" });
    }
    try {
      const { matchId } = req.params;
      const { team, players } = req.body;
      const userId = req.user.id;

      if (!["home", "away"].includes(team)) {
        return res.status(400).json({ message: "Invalid team" });
      }

      const match = await Match.findById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.status !== "draft") {
        return res.status(400).json({
          message: "Predictions are closed"
        });
      }

      const teamName = team === "home"
        ? match.homeTeam
        : match.awayTeam;

      const squad = await TeamSquad.findOne({ team: teamName });
      if (!squad) {
        return res.status(404).json({ message: "Team squad not found" });
      }

      // проверка игроков
      for (const p of players) {
        if (!squad.players.some(id => id.toString() === p.playerId)) {
          return res.status(400).json({
            message: `Player ${p.playerId} not in squad`
          });
        }
      }

      // если user уже делал prediction → перезаписываем
      match.predictedLineups = match.predictedLineups.filter(
        p => !(p.user.toString() === userId && p.team === team)
      );

      match.predictedLineups.push({
        user: userId,
        team,
        players: players.map(p => ({
          player: new mongoose.Types.ObjectId(p.playerId),
          position: p.position
        }))
      });

      await match.save();

      res.json({
        message: "Prediction saved",
        team,
        playersCount: players.length
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;
