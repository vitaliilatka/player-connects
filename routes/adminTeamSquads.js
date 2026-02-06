// routes/adminTeamSquads.js
import express from "express";
import mongoose from "mongoose";
import TeamSquad from "../models/TeamSquad.js";
import Player from "../models/Player.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /admin/teamsquads
 * Получить все команды с составами
 */
router.get(
  "/teamsquads",
  authMiddleware("admin"),
  async (req, res) => {
    try {
      const squads = await TeamSquad.find()
        .populate("players", "name rating");

      res.json(squads);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * GET /admin/teamsquads/:team
 * Получить состав конкретной команды
 */
router.get(
  "/teamsquads/:team",
  authMiddleware("admin"),
  async (req, res) => {
    try {
      const squad = await TeamSquad.findOne({ team: req.params.team })
        .populate("players", "name rating");

      if (!squad) {
        return res.status(404).json({ message: "Team squad not found" });
      }

      res.json(squad);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * POST /admin/teamsquads
 * Создать новый TeamSquad
 * body: { team: "Liverpool", season?: "2025/26" }
 */
router.post(
  "/teamsquads",
  authMiddleware("admin"),
  async (req, res) => {
    try {
      const { team, season } = req.body;

      if (!team) {
        return res.status(400).json({ message: "Team name is required" });
      }

      const exists = await TeamSquad.findOne({ team });
      if (exists) {
        return res.status(400).json({ message: "Team squad already exists" });
      }

      const squad = await TeamSquad.create({
        team,
        season,
        players: []
      });

      res.status(201).json(squad);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * POST /admin/teamsquads/:team/add-player
 * Добавить игрока в состав команды
 * body: { playerId }
 */
router.post(
  "/teamsquads/:team/add-player",
  authMiddleware("admin"),
  async (req, res) => {
    try {
      const { team } = req.params;
      const { playerId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(playerId)) {
        return res.status(400).json({ message: "Invalid playerId" });
      }

      const squad = await TeamSquad.findOne({ team });
      if (!squad) {
        return res.status(404).json({ message: "Team squad not found" });
      }

      const player = await Player.findById(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      if (squad.players.some(id => id.toString() === playerId)) {
        return res.status(400).json({ message: "Player already in squad" });
      }

      squad.players.push(player._id);
      await squad.save();

      res.json({
        message: "Player added to team squad",
        team,
        player: {
          id: player._id,
          name: player.name
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * DELETE /admin/teamsquads/:team/remove-player/:playerId
 * Удалить игрока из состава команды
 */
router.delete(
  "/teamsquads/:team/remove-player/:playerId",
  authMiddleware("admin"),
  async (req, res) => {
    try {
      const { team, playerId } = req.params;

      const squad = await TeamSquad.findOne({ team });
      if (!squad) {
        return res.status(404).json({ message: "Team squad not found" });
      }

      const before = squad.players.length;

      squad.players = squad.players.filter(
        id => id.toString() !== playerId
      );

      if (squad.players.length === before) {
        return res.status(404).json({ message: "Player not in squad" });
      }

      await squad.save();

      res.json({
        message: "Player removed from team squad",
        team,
        playerId
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;
