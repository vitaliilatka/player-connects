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



// ---------------------------------------------------------------------

// // services/matchProcessor.js

// import Player from "../models/Player.js";

// /*
// ========================================
// HELPERS
// ========================================
// */

// function buildTimeline(match, team) {
//   const timeline = {};

//   const lineup = match.lineups?.[team] || [];
//   const subs = match.substitutions?.[team] || [];

//   // starting XI
//   for (const p of lineup) {
//     timeline[p.player.toString()] = {
//       from: 0,
//       to: 120
//     };
//   }

//   // substitutions
//   for (const s of subs) {
//     const outId = s.playerOut.toString();
//     const inId = s.playerIn.toString();

//     if (timeline[outId]) {
//       timeline[outId].to = s.minute;
//     }

//     timeline[inId] = {
//       from: s.minute,
//       to: 120
//     };
//   }

//   return timeline;
// }

// function playerWasOnField(timeline, playerId, minute) {
//   const slot = timeline[playerId];
//   if (!slot) return false;
//   return minute >= slot.from && minute <= slot.to;
// }

// async function inc(playerId, stat, value = 1) {
//   await Player.findByIdAndUpdate(playerId, {
//     $inc: { [stat]: value }
//   });
// }

// /*
// ========================================
// MAIN PROCESSOR
// ========================================
// */

// export async function processMatch(match) {
//   // 🔒 Protection from double processing
//   if (!match || match.processed) return;
//   if (match.status !== "finished") return;

//   const homeGoals = match.score?.home ?? 0;
//   const awayGoals = match.score?.away ?? 0;

//   const draw = homeGoals === awayGoals;
//   const homeWin = homeGoals > awayGoals;
//   const awayWin = awayGoals > homeGoals;

//   const homeTimeline = buildTimeline(match, "home");
//   const awayTimeline = buildTimeline(match, "away");

//   /*
//   ========================================
//   BASE PLAYER STATS
//   ========================================
//   */

//   async function processBase(team, timeline, goalsAgainst, isWinner) {
//     const lineup = match.lineups?.[team] || [];
//     const subs = match.substitutions?.[team] || [];

//     // STARTERS
//     for (const p of lineup) {
//       const id = p.player;

//       await inc(id, "games", 1);
//       await inc(id, "starts", 1);

//       if (draw) await inc(id, "draws", 1);
//       else if (isWinner) await inc(id, "wins", 1);
//       else await inc(id, "losses", 1);

//       const player = await Player.findById(id);
//       if (!player) continue;

//       if (
//         goalsAgainst === 0 &&
//         (player.position === "GK" || player.position === "DEF")
//       ) {
//         await inc(id, "cleansheets", 1);
//       }

//       if (player.position === "GK" || player.position === "DEF") {
//         await inc(id, "goalsconceded", goalsAgainst);
//       }
//     }

//     // SUBS IN
//     for (const s of subs) {
//       const id = s.playerIn;

//       await inc(id, "games", 1);
//       await inc(id, "subs_in", 1);

//       if (draw) await inc(id, "draws", 1);
//       else if (isWinner) await inc(id, "wins", 1);
//       else await inc(id, "losses", 1);

//       // register sub out
//       await inc(s.playerOut, "subs_out", 1);
//     }
//   }

//   await processBase("home", homeTimeline, awayGoals, homeWin);
//   await processBase("away", awayTimeline, homeGoals, awayWin);

//   /*
//   ========================================
//   GOALS
//   ========================================
//   */

//   async function processGoals(team, timeline) {
//     const goals = match.events?.goals?.[team] || [];

//     for (const g of goals) {
//       const minute = g.minute;
//       const scorer = g.scorer?.toString();

//       if (!scorer) continue;

//       if (!playerWasOnField(timeline, scorer, minute)) continue;

//       if (g.ownGoal) {
//         await inc(scorer, "own_goals", 1);
//       } else {
//         await inc(scorer, "goals", 1);
//       }

//       if (g.assist) {
//         const assist = g.assist.toString();
//         if (playerWasOnField(timeline, assist, minute)) {
//           await inc(assist, "assists", 1);
//         }
//       }

//       if (g.penalty?.isPenalty && g.penalty?.earnedBy) {
//         await inc(g.penalty.earnedBy, "penalty_earned", 1);
//       }
//     }
//   }

//   await processGoals("home", homeTimeline);
//   await processGoals("away", awayTimeline);

//   /*
//   ========================================
//   MISSED PENALTIES
//   ========================================
//   */

//   async function processMissedPenalties(team, timeline, opponentTimeline) {
//     const list = match.events?.missedPenalties?.[team] || [];

//     for (const p of list) {
//       const minute = p.minute;
//       const taker = p.takenBy?.toString();

//       if (taker && playerWasOnField(timeline, taker, minute)) {
//         await inc(taker, "penalty_missed", 1);
//       }

//       if (p.earnedBy) {
//         await inc(p.earnedBy, "penalty_earned", 1);
//       }

//       // detect opponent goalkeeper
//       for (const pid in opponentTimeline) {
//         const player = await Player.findById(pid);
//         if (!player) continue;

//         if (
//           player.position === "GK" &&
//           playerWasOnField(opponentTimeline, pid, minute)
//         ) {
//           await inc(pid, "penalty_saved", 1);
//           break;
//         }
//       }
//     }
//   }

//   await processMissedPenalties("home", homeTimeline, awayTimeline);
//   await processMissedPenalties("away", awayTimeline, homeTimeline);

//   /*
//   ========================================
//   CARDS
//   ========================================
//   */

//   async function processCards(team, timeline) {
//     const cards = match.events?.cards?.[team] || [];

//     for (const c of cards) {
//       const pid = c.player?.toString();
//       if (!pid) continue;

//       if (!playerWasOnField(timeline, pid, c.minute)) continue;

//       if (c.type === "yellow") {
//         await inc(pid, "yellowcards", 1);
//       }

//       if (c.type === "red") {
//         await inc(pid, "redcards", 1);
//       }
//     }
//   }

//   await processCards("home", homeTimeline);
//   await processCards("away", awayTimeline);

//   /*
//   ========================================
//   MOTM
//   ========================================
//   */

//   if (match.events?.motm) {
//     await inc(match.events.motm, "bonus", 1);
//   }

//   // 🔒 mark as processed
//   match.processed = true;
//   await match.save();
// }


