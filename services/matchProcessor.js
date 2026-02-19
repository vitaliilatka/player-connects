// services/matchProcessor.js

import Player from "../models/Player.js";

export async function processMatch(match) {
  if (match.processed) return;

  const homeGoals = match.score.home;
  const awayGoals = match.score.away;

  const isDraw = homeGoals === awayGoals;
  const homeWin = homeGoals > awayGoals;
  const awayWin = awayGoals > homeGoals;

  /* =========================
     PROCESS TEAM
  ========================= */

  async function processTeam(teamKey, goalsFor, goalsAgainst, isWinner) {
    const lineup = match.lineups[teamKey] || [];
    const subs = match.subsIn[teamKey] || [];
    const goals = match.events.goals[teamKey] || [];

    /* STARTING XI */
    for (const p of lineup) {
      const player = await Player.findById(p.player);
      if (!player) continue;

      player.games += 1;
      player.starts += 1;

      if (isDraw) player.draws += 1;
      else if (isWinner) player.wins += 1;
      else player.losses += 1;

      if (
        goalsAgainst === 0 &&
        (player.position === "GK" || player.position === "DEF")
      ) {
        player.cleansheets += 1;
      }

      if (player.position === "GK" || player.position === "DEF") {
        player.goalsconceded += goalsAgainst;
      }

      await player.save();
    }

    /* SUBS */
    for (const s of subs) {
      const player = await Player.findById(s.player);
      if (!player) continue;

      player.games += 1;
      player.subs_in += 1;

      if (isDraw) player.draws += 1;
      else if (isWinner) player.wins += 1;
      else player.losses += 1;

      if (
        goalsAgainst === 0 &&
        (player.position === "GK" || player.position === "DEF")
      ) {
        player.cleansheets += 1;
      }

      if (player.position === "GK" || player.position === "DEF") {
        player.goalsconceded += goalsAgainst;
      }

      await player.save();
    }

    /* GOALS & ASSISTS */
    for (const g of goals) {
      const scorer = await Player.findById(g.scorer);
      if (scorer) {
        scorer.goals += 1;
        await scorer.save();
      }

      if (g.assist) {
        const assist = await Player.findById(g.assist);
        if (assist) {
          assist.assists += 1;
          await assist.save();
        }
      }
    }

    /* MOTM */
    if (match.events.motm) {
      const motmPlayer = await Player.findById(match.events.motm);
      if (motmPlayer) {
        motmPlayer.bonus += 1;
        await motmPlayer.save();
      }
    }
  }

  await processTeam("home", homeGoals, awayGoals, homeWin);
  await processTeam("away", awayGoals, homeGoals, awayWin);

  match.processed = true;
  await match.save();
}
