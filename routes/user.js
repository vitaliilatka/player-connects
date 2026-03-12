import express from "express";
import User from "../models/User.js";
import Match from "../models/Match.js";
import UserPrediction from "../models/UserPrediction.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

import MatchdayWinner from "../models/MatchdayWinner.js";
import TeamSquad from "../models/TeamSquad.js";

const router = express.Router();

/* =========================
   SELECT TEAM (ONE TIME)
========================= */

router.post("/select-team", authMiddleware(), async (req, res) => {
  try {
    const { team } = req.body;

    if (!team)
      return res.status(400).json({ message: "Team is required" });

    const user = await User.findById(req.user.id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.role === "admin")
      return res.status(403).json({ message: "Admins cannot select team" });

    if (user.selectedTeam)
      return res.status(400).json({ message: "Team already selected" });

    user.selectedTeam = team;
    await user.save();

    res.json({
      message: "Team selected successfully",
      selectedTeam: user.selectedTeam
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* =========================
   GET CURRENT USER TEAMSQUAD
========================= */

router.get("/squad/:team", authMiddleware("user"), async (req, res) => {
  
  console.log("TEAM REQUESTED:", req.params.team)

try{

const squad = await TeamSquad.findOne({team:req.params.team})
.populate("players","name rating");

if(!squad){
return res.status(404).json({message:"Squad not found"});
}

res.json(squad);

}catch(err){
res.status(500).json({message:err.message});
}

});


/* =========================
   GET CURRENT USER DASHBOARD
========================= */

router.get("/dashboard", authMiddleware(), async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    /* =========================
       NEXT MATCH FOR USER TEAM
    ========================= */

    let nextMatch = null;
    let existingPrediction = null;

    if (user.selectedTeam) {

      const now = new Date();

      nextMatch = await Match.findOne({
        status: "draft",
        kickoff: { $gt: now },
        $or: [
          { homeTeam: user.selectedTeam },
          { awayTeam: user.selectedTeam }
        ]
      }).sort({ kickoff: 1 });

      if (nextMatch) {

        existingPrediction = await UserPrediction.findOne({
          user: user._id,
          match: nextMatch._id
        });

      }
    }

    res.json({
      user: {
        username: user.username,
        selectedTeam: user.selectedTeam,
        totalPoints: user.totalPoints,
        ratingPosition: user.ratingPosition,
        lastMatchdayPoints: user.lastMatchdayPoints,
        lastMatchdayPosition: user.lastMatchdayPosition
      },
      nextMatch,
      existingPrediction
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* =========================
   Matchday rating
========================= */

router.get("/rating/matchday/:matchday", async (req, res) => {
  try {

    const matchday = Number(req.params.matchday);

    const rating = await UserPrediction.aggregate([

      {
        $match: { matchday }
      },

      {
        $group: {
          _id: "$user",
          points: { $sum: "$points" }
        }
      },

      {
        $sort: { points: -1 }
      }

    ]);

    const users = await User.find({
      _id: { $in: rating.map(r => r._id) }
    });

    const result = rating.map((r, index) => {

      const user = users.find(u => u._id.toString() === r._id.toString());

      return {
        username: user?.username,
        points: r.points,
        position: index + 1
      };

    });

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* =========================
   Team Rating
========================= */

router.get("/rating/team/:team", async (req, res) => {

  try {

    const team = req.params.team;

    const users = await User.find({ selectedTeam: team });

    const ids = users.map(u => u._id);

    const rating = await UserPrediction.aggregate([

      {
        $match: { user: { $in: ids } }
      },

      {
        $group: {
          _id: "$user",
          totalPoints: { $sum: "$points" }
        }
      },

      {
        $sort: { totalPoints: -1 }
      }

    ]);

    const result = rating.map((r, index) => {

      const user = users.find(u => u._id.toString() === r._id.toString());

      return {
        username: user?.username,
        totalPoints: r.totalPoints,
        position: index + 1
      };

    });

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

});

/* =========================
   Matchday Winner
========================= */

router.get("/matchday/winner/:matchday", async (req, res) => {

  const winner = await MatchdayWinner
    .findOne({ matchday: req.params.matchday })
    .populate("user", "username");

  if (!winner) {
    return res.json({ message: "Winner not calculated yet" });
  }

  res.json({
    matchday: winner.matchday,
    username: winner.user.username,
    points: winner.points
  });

});


/* =========================
   GET RATING TABLE (FOR TEST)
========================= */

router.get("/rating", authMiddleware(), async (req, res) => {
  try {

    const users = await User.find({ role: "user" })
      .sort({ totalPoints: -1 })
      .select("username totalPoints ratingPosition");

    res.json(users);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;