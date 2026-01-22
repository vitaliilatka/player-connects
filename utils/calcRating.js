// utils/calcRating.js

export function calcRating(player) {
  // If the player did not play any games, ignore all other stats
  if (!player.games || player.games <= 0) return 0;

  // Normalize all numeric fields to be at least 0
  const games = Math.max(0, player.games || 0);
  const goals = Math.max(0, player.goals || 0);
  const assists = Math.max(0, player.assists || 0);
  const cleansheets = Math.max(0, player.cleansheets || 0);
  const saves = Math.max(0, player.saves || 0);
  const blocks = Math.max(0, player.blocks || 0);
  const penalty_earned = Math.max(0, player.penalty_earned || 0);
  const penalty_saved = Math.max(0, player.penalty_saved || 0);
  const bonus = Math.max(0, player.bonus || 0);
  const goalsconceded = Math.max(0, player.goalsconceded || 0);
  const penalty_missed = Math.max(0, player.penalty_missed || 0);
  const yellowcards = Math.max(0, player.yellowcards || 0);
  const redcards = Math.max(0, player.redcards || 0);

  // Rating formula
  const rating =
    games * 2 +
    goals * 4 +
    assists * 3 +
    cleansheets * 4 +
    saves +
    blocks +
    penalty_earned * 2 +
    penalty_saved * 4 +
    bonus * 3 -
    goalsconceded -
    penalty_missed * 2 -
    yellowcards -
    redcards * 2;

  // Ensure rating is not negative
  return Math.max(0, Math.round(rating));
}
