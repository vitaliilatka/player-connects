import express from "express";
import UserPrediction from "../models/UserPrediction.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/", async (req, res) => {

  try {

    const rating = await UserPrediction.aggregate([

      {
        $group: {
          _id: "$user",
          points: { $sum: "$points" }
        }
      },

      {
        $sort: { points: -1 }
      },

      {
        $limit: 50
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

export default router;