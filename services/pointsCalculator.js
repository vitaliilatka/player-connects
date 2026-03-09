export function calculatePoints(prediction, match) {

  let totalPoints = 0;

  const breakdown = {
    lineup: {
      correct: 0,
      bonus: 0,
      points: 0
    },
    substitutions: {
      correct: 0,
      bonus: 0,
      points: 0
    },
    goals: {
      scorerPoints: 0,
      assistPoints: 0,
      playerConnectBonus: 0,
      points: 0
    },
    score: {
      exactScore: false,
      homeGoalsCorrect: false,
      awayGoalsCorrect: false,
      points: 0
    },
    motm: {
      correct: false,
      points: 0
    }
  };

  /* =========================
     SCORE
  ========================= */

  if (
    prediction.predictedScore.home === match.score.home &&
    prediction.predictedScore.away === match.score.away
  ) {

    breakdown.score.exactScore = true;
    breakdown.score.points = 3;

  } else {

    if (prediction.predictedScore.home === match.score.home) {
      breakdown.score.homeGoalsCorrect = true;
      breakdown.score.points += 1;
    }

    if (prediction.predictedScore.away === match.score.away) {
      breakdown.score.awayGoalsCorrect = true;
      breakdown.score.points += 1;
    }

  }

  totalPoints += breakdown.score.points;

  /* =========================
     MOTM
  ========================= */

  if (
    prediction.motm &&
    match.events?.motm &&
    prediction.motm.toString() === match.events.motm.toString()
  ) {

    breakdown.motm.correct = true;
    breakdown.motm.points = 3;

    totalPoints += 3;

  }

  /* =========================
     LINEUP
  ========================= */

  const realLineup = match.lineups[prediction.team] || [];

  const realPlayers = realLineup.map(p => p.player.toString());

  const predictedPlayers =
    prediction.players?.map(p => p.player.toString()) || [];

  let correctPlayers = 0;

  for (const p of predictedPlayers) {

    if (realPlayers.includes(p)) {
      correctPlayers++;
    }

  }

  breakdown.lineup.correct = correctPlayers;

  breakdown.lineup.points = correctPlayers;

  if (correctPlayers === 11) {
    breakdown.lineup.bonus = 3;
    breakdown.lineup.points += 3;
  }

  totalPoints += breakdown.lineup.points;

  /* =========================
     SUBSTITUTIONS
  ========================= */

  const realSubs = match.substitutions[prediction.team] || [];

  let correctSubs = 0;

  for (const ps of prediction.subs || []) {

    const predictedId = ps.player.toString();

    const found = realSubs.find(rs =>
      rs.playerIn.toString() === predictedId
    );

    if (found) correctSubs++;

  }

  breakdown.substitutions.correct = correctSubs;
  breakdown.substitutions.points = correctSubs;

  totalPoints += correctSubs;

  /* =========================
     GOALS
  ========================= */

  const realGoals = match.events.goals[prediction.team] || [];

  for (const g of realGoals) {

    const predicted = prediction.goals?.find(pg =>
      pg.scorer.toString() === g.scorer.toString()
    );

    if (predicted) {

      breakdown.goals.scorerPoints += 3;

      if (
        predicted.assist &&
        g.assist &&
        predicted.assist.toString() === g.assist.toString()
      ) {

        breakdown.goals.assistPoints += 3;
        breakdown.goals.playerConnectBonus += 3;

      }

    }

  }

  breakdown.goals.points =
    breakdown.goals.scorerPoints +
    breakdown.goals.assistPoints +
    breakdown.goals.playerConnectBonus;

  totalPoints += breakdown.goals.points;

  return {
    totalPoints,
    breakdown
  };

}
