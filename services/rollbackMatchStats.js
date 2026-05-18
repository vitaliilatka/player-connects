import Player from "../models/Player.js";

export async function rollbackMatchStats(match) {

  const homeWon =
    match.score.home > match.score.away;

  const awayWon =
    match.score.away > match.score.home;

  async function rollbackTeam(lineup, teamWon, goals) {

    for (const p of lineup) {

      const player = await Player.findById(p.player);

      if (!player) continue;

      player.stats.games -= 1;

      if (teamWon) {
        player.stats.wins -= 1;
      }

      await player.save();
    }

    for (const g of goals) {

      // scorer
      const scorer = await Player.findById(g.scorer);

      if (scorer) {
        scorer.stats.goals -= 1;
        await scorer.save();
      }

      // assist
      if (g.assist) {

        const assister =
          await Player.findById(g.assist);

        if (assister) {
          assister.stats.assists -= 1;
          await assister.save();
        }
      }
    }
  }

  await rollbackTeam(
    match.lineups.home,
    homeWon,
    match.events.goals.home
  );

  await rollbackTeam(
    match.lineups.away,
    awayWon,
    match.events.goals.away
  );
}