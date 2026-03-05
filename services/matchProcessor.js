// services/matchProcessor.js
import Match from "../models/Match.js";
import UserPrediction from "../models/UserPrediction.js";

export const processMatch = async (match) => {
  if (match.processed) return;

  const predictions = await UserPrediction.find({
    match: match._id
  });

  for (const prediction of predictions) {
    let points = 0;

    /* =========================
       SCORE POINTS
    ========================= */

    if (
      prediction.predictedScore.home === match.score.home &&
      prediction.predictedScore.away === match.score.away
    ) {
      points += 3;
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
        points += 1;
      }
    }

    prediction.points = points;
    await prediction.save();
  }

  match.processed = true;
  await match.save();
};

