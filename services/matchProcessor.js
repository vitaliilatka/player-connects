import Match from "../models/Match.js";
import UserPrediction from "../models/UserPrediction.js";

export const processMatch = async (matchId) => {

  const match = await Match.findById(matchId);

  if (!match || match.processed) return;

  const predictions = await UserPrediction.find({
    match: match._id
  });

  for (const prediction of predictions) {

    let totalPoints = 0;

    /* SCORE */

    if (
      prediction.predictedScore.home === match.score.home &&
      prediction.predictedScore.away === match.score.away
    ) {
      totalPoints += 3;
    } else {

      const predictedDiff =
        prediction.predictedScore.home -
        prediction.predictedScore.away;

      const realDiff =
        match.score.home -
        match.score.away;

      if (
        (predictedDiff > 0 && realDiff > 0) ||
        (predictedDiff < 0 && realDiff < 0) ||
        (predictedDiff === 0 && realDiff === 0)
      ) {
        totalPoints += 1;
      }

    }

    /* TODO later:
       lineup points
       subs points
       goals points
       motm points
    */

    prediction.points = totalPoints;

    await prediction.save();
  }

  match.processed = true;
  await match.save();
};
