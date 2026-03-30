// routes/admin.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../utils/uploadConfig.js";

import League from "../models/League.js";
import Player from "../models/Player.js";
import TeamSquad from "../models/TeamSquad.js";

const router = express.Router();

/* ============================
   GET /admin/leagues
============================ */
router.get("/leagues", authMiddleware(), async (req, res) => {
  try {
    const leagues = await League.find({
      $or: [{ owner: req.user.id }, { admins: req.user.id }],
    });

    res.json(leagues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load leagues" });
  }
});

/* ============================
   POST /admin/leagues
   🔥 FIX: lowercase
============================ */
router.post("/leagues", authMiddleware(), async (req, res) => {
  try {
    let { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "League name is required" });
    }

    name = name.trim();
    const teamKey = name.toLowerCase(); // 🔥 ключ

    const existing = await League.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "League already exists" });
    }

    const league = new League({
      name, // красиво для UI
      owner: req.user.id,
      admins: [req.user.id],
    });

    await league.save();

    // 🔥 создаем squad в lowercase
    const existingSquad = await TeamSquad.findOne({ team: teamKey });

    if (!existingSquad) {
      await TeamSquad.create({
        team: teamKey,
        players: [],
      });
    }

    res.json(league);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error creating league" });
  }
});

/* ============================
   POST /admin/players
============================ */
router.post(
  "/players",
  authMiddleware(),
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, position, leagueId } = req.body;

      if (!name || !position || !leagueId) {
        return res.status(400).json({ message: "Missing fields" });
      }

      const league = await League.findById(leagueId);
      if (!league) {
        return res.status(404).json({ message: "League not found" });
      }

      const teamKey = league.name.trim().toLowerCase(); // 🔥

      const newPlayer = new Player({
        name,
        team: teamKey,
        position,
        league: leagueId,
        image: req.file ? req.file.path : null,
      });

      await newPlayer.save();

      // 🔥 НАДЕЖНОЕ СОЗДАНИЕ/ПОИСК SQUAD
      let squad = await TeamSquad.findOne({ team: teamKey });

      if (!squad) {
        squad = await TeamSquad.create({
          team: teamKey,
          players: [],
        });
      }

      // 🔥 добавление игрока
      if (!squad.players.includes(newPlayer._id)) {
        squad.players.push(newPlayer._id);
        await squad.save();
      }

      res.status(201).json(newPlayer);

    } catch (err) {
      console.error("Player creation error:", err);
      res.status(500).json({ message: "Failed to add player" });
    }
  }
);

/* ============================
   DELETE player
============================ */
router.delete("/players/:id", authMiddleware(), async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ message: "Player not found" });

    await player.deleteOne();

    const squad = await TeamSquad.findOne({ team: player.team });

    if (squad) {
      squad.players = squad.players.filter(
        (id) => id.toString() !== player._id.toString()
      );
      await squad.save();
    }

    res.json({ message: "Player deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete player" });
  }
});

export default router;

