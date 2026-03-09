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

// ------------------------------------------------------------------

// import Match from "../models/Match.js";
// import UserPrediction from "../models/UserPrediction.js";
// import MatchdayWinner from "../models/MatchdayWinner.js";

// export async function processMatchdayWinner(matchday) {

//   console.log("Processing matchday winner:", matchday);

//   const matches = await Match.find({
//     matchday: Number(matchday)
//   });

//   if (!matches.length) {
//     console.log("No matches in this matchday");
//     return;
//   }

//   const unfinished = matches.find(m => m.status !== "finished");

//   if (unfinished) {
//     console.log("Matchday not finished yet");
//     return;
//   }

//   const rating = await UserPrediction.aggregate([

//     {
//       $lookup: {
//         from: "matches",
//         localField: "match",
//         foreignField: "_id",
//         as: "matchData"
//       }
//     },

//     { $unwind: "$matchData" },

//     {
//       $match: {
//         "matchData.matchday": Number(matchday)
//       }
//     },

//     {
//       $group: {
//         _id: "$user",
//         points: { $sum: "$points" }
//       }
//     },

//     { $sort: { points: -1 } },

//     { $limit: 1 }

//   ]);

//   if (!rating.length) {
//     console.log("No predictions for this matchday");
//     return;
//   }

//   await MatchdayWinner.findOneAndUpdate(
//     { matchday: Number(matchday) },
//     {
//       user: rating[0]._id,
//       points: rating[0].points
//     },
//     { upsert: true, new: true }
//   );

//   console.log("Matchday winner updated");

// }