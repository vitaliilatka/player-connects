import express from "express";
import TeamSquad from "../models/TeamSquad.js";
import Player from "../models/Player.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   POST /admin/team-squads
   Создать или перезаписать squad команды
========================= */
router.post(
  "/team-squads",
  authMiddleware("admin"),
  async (req, res) => {
    try {
      const { team, players } = req.body;

      if (!team || !Array.isArray(players)) {
        return res.status(400).json({
          message: "team and players[] are required"
        });
      }

      if (players.length === 0) {
        return res.status(400).json({
          message: "players array cannot be empty"
        });
      }

      // Проверяем, что все игроки реально существуют
      const existingPlayers = await Player.find({
        _id: { $in: players }
      });

      if (existingPlayers.length !== players.length) {
        return res.status(400).json({
          message: "One or more players not found"
        });
      }

      // upsert: если squad есть → обновляем, если нет → создаём
      const squad = await TeamSquad.findOneAndUpdate(
        { team },
        { team, players },
        { new: true, upsert: true }
      );

      res.json({
        message: "✅ Team squad saved",
        squad
      });
    } catch (err) {
      console.error("TeamSquad save error:", err);
      res.status(500).json({
        message: "Failed to save team squad"
      });
    }
  }
);

/* =========================
   GET /admin/team-squads
   Получить все squads
========================= */
router.get(
  "/team-squads",
  authMiddleware("admin"),
  async (req, res) => {
    try {
      const squads = await TeamSquad.find()
        .populate("players")
        .sort({ team: 1 });

      res.json(squads);
    } catch (err) {
      console.error("TeamSquad load error:", err);
      res.status(500).json({
        message: "Failed to load team squads"
      });
    }
  }
);

/* =========================
   GET /admin/team-squads/:team
   Получить squad одной команды
========================= */
router.get(
  "/team-squads/:team",
  authMiddleware("admin"),
  async (req, res) => {
    try {
      const squad = await TeamSquad.findOne({
        team: req.params.team
      }).populate("players");

      if (!squad) {
        return res.status(404).json({
          message: "Team squad not found"
        });
      }

      res.json(squad);
    } catch (err) {
      console.error("TeamSquad load error:", err);
      res.status(500).json({
        message: "Failed to load team squad"
      });
    }
  }
);

export default router;
