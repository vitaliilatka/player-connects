import Match from "../models/Match.js";
import UserPrediction from "../models/UserPrediction.js";
import { calculatePoints } from "./pointsCalculator.js";

export const processMatch = async (matchId) => {

  console.log("Processing match:", matchId);

  const match = await Match.findById(matchId);

  if (!match) {
    console.log("Match not found");
    return;
  }

  if (match.status !== "finished") {
    console.log("Match not finished yet");
    return;
  }

  const predictions = await UserPrediction.find({
    match: match._id
  });

  console.log("Predictions found:", predictions.length);

  for (const prediction of predictions) {

    const result = calculatePoints(prediction, match);

    console.log(
      "User:",
      prediction.user,
      "points:",
      result.totalPoints
    );

    prediction.points = result.totalPoints;

    await prediction.save();

  }

  match.processed = true;

  await match.save();

  console.log("Match processed successfully");

};

