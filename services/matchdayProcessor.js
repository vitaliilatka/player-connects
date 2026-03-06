import UserPrediction from "../models/UserPrediction.js";
import MatchdayWinner from "../models/MatchdayWinner.js";

export async function processMatchdayWinner(matchday) {

  const rating = await UserPrediction.aggregate([

    {
      $lookup: {
        from: "matches",
        localField: "match",
        foreignField: "_id",
        as: "matchData"
      }
    },

    { $unwind: "$matchData" },

    {
      $match: {
        "matchData.matchday": Number(matchday)
      }
    },

    {
      $group: {
        _id: "$user",
        points: { $sum: "$points" }
      }
    },

    { $sort: { points: -1 } },

    { $limit: 1 }

  ]);

  if (!rating.length) return;

  await MatchdayWinner.findOneAndUpdate(
    { matchday: Number(matchday) },
    {
      user: rating[0]._id,
      points: rating[0].points
    },
    { upsert: true }
  );

}


// ---------------------------------------------------------------------

// import UserPrediction from "../models/UserPrediction.js";
// import MatchdayWinner from "../models/MatchdayWinner.js";

// export async function processMatchdayWinner(matchday) {

//   const rating = await UserPrediction.aggregate([

//     { $match: { matchday } },

//     {
//       $group: {
//         _id: "$user",
//         points: { $sum: "$points" }
//       }
//     },

//     { $sort: { points: -1 } },

//     { $limit: 1 }

//   ]);

//   if (!rating.length) return;

//   await MatchdayWinner.findOneAndUpdate(
//     { matchday },
//     {
//       user: rating[0]._id,
//       points: rating[0].points
//     },
//     { upsert: true }
//   );

// }