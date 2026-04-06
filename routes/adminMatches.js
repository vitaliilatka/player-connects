/*adminMatches.js*/

import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import TeamSquad from "../models/TeamSquad.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { processMatch } from "../services/matchProcessor.js";
import { updateRating } from "../services/ratingProcessor.js";

import { processMatchdayWinner } from "../services/matchdayProcessor.js";

const router = express.Router();


/* =========================
   LINEUP VALIDATION
========================= */

function validateLineup(players) {
  if (!Array.isArray(players)) return "Players must be an array";
  if (players.length !== 11) return "Lineup must contain exactly 11 players";

  const ids = new Set();
  let gkCount = 0;

  for (const p of players) {
    if (!p.playerId || !p.position)
      return "Each player must have playerId and position";

    const pos = p.position.toUpperCase();

    if (ids.has(p.playerId))
      return "Duplicate players are not allowed";

    ids.add(p.playerId);

    if (pos === "GK") gkCount++;
  }

  if (gkCount !== 1)
    return "Exactly one GK is required";

  return null;
}

/* =========================
   EVENT VALIDATION
========================= */

function validateMatchEvents({
  lineup,
  subs,
  goals,
  missedPenalties,
  cards,
  motm,
  score
}) {

  if (!lineup || lineup.length !== 11)
    return "Lineup must be set before saving result";

  if (subs.length > 5)
    return "Maximum 5 substitutions allowed";

  const lineupIds = lineup.map(p => p.player.toString());

  const subInMap = new Map();
  const subOutMap = new Map();

  for (const s of subs) {

    if (s.minute < 1 || s.minute > 130)
      return "Invalid substitution minute";

    const outId = s.playerOut.toString();
    const inId = s.playerIn.toString();

    if (!lineupIds.includes(outId) && !subInMap.has(outId))
      return "Cannot sub out player not currently on field";

    if (subOutMap.has(outId))
      return "Player cannot be subbed out twice";

    if (subInMap.has(inId))
      return "Player cannot be subbed in twice";

    subOutMap.set(outId, s.minute);
    subInMap.set(inId, s.minute);
  }

  const getInterval = (playerId) => {

    let from = 0;
    let to = 130;

    if (subInMap.has(playerId))
      from = subInMap.get(playerId);

    if (subOutMap.has(playerId))
      to = subOutMap.get(playerId);

    return { from, to };
  };

  const isActive = (playerId, minute) => {
    const { from, to } = getInterval(playerId);
    return minute >= from && minute <= to;
  };

  const validateEventsArray = (events, type) => {
    for (const e of events) {

      if (!e.minute || e.minute < 1 || e.minute > 130)
        return `${type}: invalid minute`;

      const involved = [];

      if (e.scorer) involved.push(e.scorer.toString());
      if (e.assist) involved.push(e.assist.toString());
      if (e.player) involved.push(e.player.toString());
      if (e.takenBy) involved.push(e.takenBy.toString());
      if (e.earnedBy) involved.push(e.earnedBy.toString());

      for (const pid of involved) {

        if (!lineupIds.includes(pid) && !subInMap.has(pid))
          return `${type}: player not in lineup or substitutions`;

        if (!isActive(pid, e.minute))
          return `${type}: player not active at minute ${e.minute}`;
      }
    }

    return null;
  };

  let err;

  err = validateEventsArray(goals, "Goal");
  if (err) return err;

  err = validateEventsArray(missedPenalties, "Missed penalty");
  if (err) return err;

  err = validateEventsArray(cards, "Card");
  if (err) return err;

  if (motm) {
    const motmId = motm.toString();
    if (!lineupIds.includes(motmId) && !subInMap.has(motmId))
      return "MOTM must be a participating player";
  }

  if (score) {
    const teamGoals = goals.length;
    if (teamGoals !== score)
      return "Goals count does not match score";
  }

  return null;
}

/* =========================
   CREATE MATCH
========================= */


router.post("/", authMiddleware("admin"), async (req, res) => {
  try {
    const { matchday, homeTeam, awayTeam, date, time, league } = req.body;

    if (!matchday || !homeTeam || !awayTeam || !date || !time) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (homeTeam === awayTeam) {
      return res.status(400).json({ message: "Teams must be different" });
    }

    // 🚫 команда не может играть дважды
    const existingMatches = await Match.find({ matchday: Number(matchday) });

    for (const m of existingMatches) {
      if (
        m.homeTeam === homeTeam ||
        m.awayTeam === homeTeam ||
        m.homeTeam === awayTeam ||
        m.awayTeam === awayTeam
      ) {
        return res.status(400).json({
          message: "Team already has match in this matchday"
        });
      }
    }

    const kickoff = new Date(`${date}T${time}`);

    const match = await Match.create({
      matchday: Number(matchday),
      homeTeam,
      awayTeam,
      kickoff,
      status: "draft"
    });

    res.status(201).json(match);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


/* =========================
   SAVE LINEUP
========================= */

router.post("/:matchId/lineup", authMiddleware("admin"), async (req, res) => {

  const { team, players } = req.body;

  if (!["home", "away"].includes(team))
    return res.status(400).json({ message: "Invalid team" });

  const validationError = validateLineup(players);
  if (validationError)
    return res.status(400).json({ message: validationError });

  try {

    const match = await Match.findById(req.params.matchId);
    if (!match)
      return res.status(404).json({ message: "Match not found" });

    const teamName = team === "home" ? match.homeTeam : match.awayTeam;
    const squad = await TeamSquad.findOne({ team: teamName });

    if (!squad)
      return res.status(404).json({ message: "Team squad not found" });

    const squadPlayerIds = new Set(
      squad.players.map(sp => {
        if (sp.player) return sp.player.toString();
        if (sp._id) return sp._id.toString();
        return sp.toString();
      })
    );

    for (const p of players) {
      if (!squadPlayerIds.has(p.playerId)) {
        return res.status(400).json({
          message: `Player ${p.playerId} not in squad`
        });
      }
    }


    match.lineups[team] = players.map(p => ({
      player: new mongoose.Types.ObjectId(p.playerId),
      position: p.position.toUpperCase()
    }));

    match.status = "live";
    await match.save();

    res.json({ message: "Lineup saved" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   SAVE RESULT
========================= */

router.post("/:id/result", authMiddleware("admin"), async (req, res) => {

  try {

    const {
      team,
      subs = [],
      goals = [],
      missedPenalties = [],
      cards = [],
      motm = null,
      score
    } = req.body;

    if (!["home", "away"].includes(team))
      return res.status(400).json({ message: "Invalid team" });

    const match = await Match.findById(req.params.id);
    if (!match)
      return res.status(404).json({ message: "Match not found" });

    const lineup = match.lineups[team];

    const preparedSubs = subs.map(s => ({
      minute: s.minute,
      playerOut: new mongoose.Types.ObjectId(s.playerOut),
      playerIn: new mongoose.Types.ObjectId(s.playerIn)
    }));

    const preparedGoals = goals.map(g => ({
      scorer: new mongoose.Types.ObjectId(g.scorer),
      assist: g.assist ? new mongoose.Types.ObjectId(g.assist) : null,
      minute: g.minute
    }));

    const preparedMissed = missedPenalties.map(p => ({
      minute: p.minute,
      takenBy: new mongoose.Types.ObjectId(p.takenBy),
      earnedBy: p.earnedBy
        ? new mongoose.Types.ObjectId(p.earnedBy)
        : null
    }));

    const preparedCards = cards.map(c => ({
      player: new mongoose.Types.ObjectId(c.player),
      minute: c.minute,
      type: c.type
    }));

    const validationError = validateMatchEvents({
      lineup,
      subs: preparedSubs,
      goals: preparedGoals,
      missedPenalties: preparedMissed,
      cards: preparedCards,
      motm,
      score: score?.[team]
    });

    if (validationError)
      return res.status(400).json({ message: validationError });

    match.substitutions[team] = preparedSubs;
    match.events.goals[team] = preparedGoals;
    match.events.missedPenalties[team] = preparedMissed;
    match.events.cards[team] = preparedCards;

    if (score) {
      match.score.home = score.home;
      match.score.away = score.away;
    }

    if (motm)
      match.events.motm = new mongoose.Types.ObjectId(motm);

    match.status = "finished";

    await match.save();
    await processMatch(match._id);
    await updateRating();
    await processMatchdayWinner(match.matchday);


    res.json({ message: "Match result saved" });

  }  catch (err) {
      console.error(err);
      res.status(500).json({
        message: err.message,
        stack: err.stack
      });
    }

});


export default router;

