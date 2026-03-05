import User from "../models/User.js";
import UserPrediction from "../models/UserPrediction.js";

export async function updateRating() {

  // 1. Get sum of points per user
  const rating = await UserPrediction.aggregate([
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

  // 2. Update users
  for (let i = 0; i < rating.length; i++) {
    await User.findByIdAndUpdate(rating[i]._id, {
      totalPoints: rating[i].totalPoints,
      ratingPosition: i + 1
    });
  }

}