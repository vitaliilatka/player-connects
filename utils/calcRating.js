// utils/calcRating.js

export function calcRating(player) {

  if (!player.games || player.games <= 0) return 0;

  const games = Math.max(0, player.games || 0);

  const wins = Math.max(0, player.wins || 0);
  const draws = Math.max(0, player.draws || 0);

  const starts = Math.max(0, player.starts || 0);
  const sub_in = Math.max(0, player.sub_in || 0);

  const goals = Math.max(0, player.goals || 0);
  const assists = Math.max(0, player.assists || 0);

  const cleansheets = Math.max(0, player.cleansheets || 0);
  const saves = Math.max(0, player.saves || 0);

  const penalty_earned = Math.max(0, player.penalty_earned || 0);
  const penalty_saved = Math.max(0, player.penalty_saved || 0);

  const bonus = Math.max(0, player.bonus || 0);

  const goalsconceded = Math.max(0, player.goalsconceded || 0);

  const penalty_missed = Math.max(0, player.penalty_missed || 0);
  const yellowcards = Math.max(0, player.yellowcards || 0);
  const redcards = Math.max(0, player.redcards || 0);

  const rating =
      games * 2 +

      wins * 3 +
      draws * 1 +

      starts * 2 +
      sub_in * 1 +

      goals * 4 +
      assists * 3 +

      cleansheets * 4 +
      saves * 1 +

      penalty_earned * 2 +
      penalty_saved * 4 +

      bonus * 3 -

      goalsconceded * 1 -

      penalty_missed * 2 -
      yellowcards * 1 -
      redcards * 2;

  return Math.max(0, Math.round(rating));
}

