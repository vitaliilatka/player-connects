import Player from "../models/Player.js";

export async function updatePlayerStats(match) {

  console.log("Updating player stats...");

  // =========================
  // RESET MATCH PLAYERS STATS
  // (optional later)
  // =========================

  const homeLineup = match.lineups.home || [];
  const awayLineup = match.lineups.away || [];

  const homeSubs = match.substitutions.home || [];
  const awaySubs = match.substitutions.away || [];

  const homeGoals = match.events.goals.home || [];
  const awayGoals = match.events.goals.away || [];

  const homeCards = match.events.cards.home || [];
  const awayCards = match.events.cards.away || [];

  const allPlayers = new Map();

  function addPlayer(id) {
    allPlayers.set(id.toString(), true);
  }

  // =========================
  // PARTICIPATION
  // =========================

  for (const p of homeLineup) {
    addPlayer(p.player);

    await Player.findByIdAndUpdate(p.player, {
      $inc: {
        games: 1,
        starts: 1
      }
    });
  }

  for (const p of awayLineup) {
    addPlayer(p.player);

    await Player.findByIdAndUpdate(p.player, {
      $inc: {
        games: 1,
        starts: 1
      }
    });
  }

  // =========================
  // SUBS
  // =========================

  for (const s of homeSubs) {

    await Player.findByIdAndUpdate(s.playerIn, {
      $inc: {
        games: 1,
        subs_in: 1
      }
    });

    await Player.findByIdAndUpdate(s.playerOut, {
      $inc: {
        subs_out: 1
      }
    });
  }

  for (const s of awaySubs) {

    await Player.findByIdAndUpdate(s.playerIn, {
      $inc: {
        games: 1,
        subs_in: 1
      }
    });

    await Player.findByIdAndUpdate(s.playerOut, {
      $inc: {
        subs_out: 1
      }
    });
  }

  // =========================
  // GOALS + ASSISTS
  // =========================

  for (const g of homeGoals) {

    await Player.findByIdAndUpdate(g.scorer, {
      $inc: {
        goals: 1
      }
    });

    if (g.assist) {
      await Player.findByIdAndUpdate(g.assist, {
        $inc: {
          assists: 1
        }
      });
    }
  }

  for (const g of awayGoals) {

    await Player.findByIdAndUpdate(g.scorer, {
      $inc: {
        goals: 1
      }
    });

    if (g.assist) {
      await Player.findByIdAndUpdate(g.assist, {
        $inc: {
          assists: 1
        }
      });
    }
  }

  // =========================
  // CARDS
  // =========================

  for (const c of homeCards) {

    if (c.type === "yellow") {
      await Player.findByIdAndUpdate(c.player, {
        $inc: {
          yellowcards: 1
        }
      });
    }

    if (c.type === "red") {
      await Player.findByIdAndUpdate(c.player, {
        $inc: {
          redcards: 1
        }
      });
    }
  }

  for (const c of awayCards) {

    if (c.type === "yellow") {
      await Player.findByIdAndUpdate(c.player, {
        $inc: {
          yellowcards: 1
        }
      });
    }

    if (c.type === "red") {
      await Player.findByIdAndUpdate(c.player, {
        $inc: {
          redcards: 1
        }
      });
    }
  }

  // =========================
  // RESULTS
  // =========================

  const homeWon = match.score.home > match.score.away;
  const awayWon = match.score.away > match.score.home;
  const draw = match.score.home === match.score.away;

  for (const p of homeLineup) {

    if (homeWon) {
      await Player.findByIdAndUpdate(p.player, {
        $inc: { wins: 1 }
      });
    }

    if (awayWon) {
      await Player.findByIdAndUpdate(p.player, {
        $inc: { losses: 1 }
      });
    }

    if (draw) {
      await Player.findByIdAndUpdate(p.player, {
        $inc: { draws: 1 }
      });
    }
  }

  for (const p of awayLineup) {

    if (awayWon) {
      await Player.findByIdAndUpdate(p.player, {
        $inc: { wins: 1 }
      });
    }

    if (homeWon) {
      await Player.findByIdAndUpdate(p.player, {
        $inc: { losses: 1 }
      });
    }

    if (draw) {
      await Player.findByIdAndUpdate(p.player, {
        $inc: { draws: 1 }
      });
    }
  }

  // =========================
  // CLEAN SHEETS
  // =========================

  if (match.score.away === 0) {

    for (const p of homeLineup) {

      const player = await Player.findById(p.player);

      if (
        player &&
        (player.position === "GK" || player.position === "DEF")
      ) {
        player.cleansheets += 1;
        await player.save();
      }
    }
  }

  if (match.score.home === 0) {

    for (const p of awayLineup) {

      const player = await Player.findById(p.player);

      if (
        player &&
        (player.position === "GK" || player.position === "DEF")
      ) {
        player.cleansheets += 1;
        await player.save();
      }
    }
  }

  console.log("Player stats updated");
}