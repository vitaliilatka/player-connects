// routes/leagues.js
import express from "express";
import League from "../models/League.js";
import Player from "../models/Player.js";

const router = express.Router();

/* ===========================================
   GET /leagues
   Get all leagues (public)
=========================================== */
router.get("/", async (req, res) => {
  try {
    const leagues = await League.find().select("name");
    res.json(leagues.map(l => ({ id: l._id, name: l.name })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================================
   POST /leagues
   Create a new league
=========================================== */
router.post("/", async (req, res) => {
  try {
    const { name, ownerId } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({ message: "name and ownerId are required" });
    }

    const exists = await League.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: "A league with this name already exists" });
    }

    const league = new League({
      name,
      owner: ownerId,
      admins: [ownerId]
    });

    await league.save();
    res.json({ id: league._id, name: league.name });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================================
   GET /leagues/:leagueId/players
   Get all players of a specific league
=========================================== */
router.get("/:leagueId/players", async (req, res) => {
  try {
    const players = await Player.find({ league: req.params.leagueId });
    res.json(players.map(p => ({ ...p.toObject(), id: p._id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================================
   POST /leagues/:leagueId/players
   Add a new player to a specific league
=========================================== */
router.post("/:leagueId/players", async (req, res) => {
  try {
    const leagueId = req.params.leagueId;

    const player = new Player({
      ...req.body,
      league: leagueId
    });

    await player.save();
    res.json(player);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================================
   PUT /leagues/:leagueId/players/:id
   Update a player in a specific league
=========================================== */
router.put("/:leagueId/players/:id", async (req, res) => {
  try {
    const updated = await Player.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================================
   DELETE /leagues/:leagueId/players/:id
   Delete a player from a league
=========================================== */
router.delete("/:leagueId/players/:id", async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.json({ message: "Player has been deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================================
   GET /leagues/default
   Get the default league for public users
=========================================== */
router.get("/default", async (req, res) => {
  try {
    const league = await League.findById(process.env.DEFAULT_LEAGUE_ID);

    if (!league) {
      return res.status(404).json({ message: "Default league not found" });
    }

    res.json({ id: league._id, name: league.name });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
