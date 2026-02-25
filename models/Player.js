import mongoose from "mongoose";

/*
  Player schema
  ----------------
  Stores player metadata and aggregated statistics.
  All stats are derived from matches.
*/

const playerSchema = new mongoose.Schema(
  {
    /* ============================
       Basic Info
    ============================ */

    name: {
      type: String,
      required: true,
      trim: true
    },

    team: {
      type: String,
      default: ""
    },

    league: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "League",
      required: true
    },

    position: {
      type: String,
      enum: ["GK", "DEF", "MID", "FW"],
      required: true
    },

    image: {
      type: String,
      default: ""
    },

    /* ============================
       Participation
    ============================ */

    games: { type: Number, default: 0 },

    starts: { type: Number, default: 0 },

    wins: { type: Number, default: 0 },

    draws: { type: Number, default: 0 },

    losses: { type: Number, default: 0 },

    subs_in: { type: Number, default: 0 },

    subs_out: { type: Number, default: 0 },

    /* ============================
       Attacking
    ============================ */

    goals: { type: Number, default: 0 },

    assists: { type: Number, default: 0 },

    /* ============================
       Defensive
    ============================ */

    saves: { type: Number, default: 0 },

    cleansheets: { type: Number, default: 0 },

    goalsconceded: { type: Number, default: 0 },

    own_goals: { type: Number, default: 0 },

    /* ============================
       Penalties
    ============================ */

    penalty_earned: { type: Number, default: 0 },

    penalty_missed: { type: Number, default: 0 },

    penalty_saved: { type: Number, default: 0 },

    /* ============================
       Discipline
    ============================ */

    yellowcards: { type: Number, default: 0 },

    redcards: { type: Number, default: 0 },

    /* ============================
       Bonus
    ============================ */

    bonus: { type: Number, default: 0 }
  },
  { timestamps: true }
);

/* ============================
   Unique name inside league
============================ */

playerSchema.index(
  { name: 1, league: 1 },
  { unique: true }
);

/* ============================
   VIRTUAL: RATING
============================ */

playerSchema.virtual("rating").get(function () {
  let score = 0;

  /* Participation */
  score += (this.games ?? 0) * 1;
  score += (this.starts ?? 0) * 2;
  score += (this.subs_in ?? 0) * 1;

  /* Results */
  score += (this.wins ?? 0) * 3;
  score += (this.draws ?? 0) * 1;
  // losses = 0

  /* Attacking */
  score += (this.goals ?? 0) * 4;
  score += (this.assists ?? 0) * 3;

  /* Own goals */
  score -= (this.own_goals ?? 0) * 1;

  /* Defensive (GK & DEF only) */
  if (this.position === "GK" || this.position === "DEF") {
    score += (this.cleansheets ?? 0) * 4;
    score -= (this.goalsconceded ?? 0) * 1;
  }

  /* GK saves */
  score += (this.saves ?? 0) * 1;

  /* Penalties */
  score += (this.penalty_earned ?? 0) * 3;
  score += (this.penalty_saved ?? 0) * 4;
  score -= (this.penalty_missed ?? 0) * 2;

  /* Discipline */
  score -= (this.yellowcards ?? 0) * 1;
  score -= (this.redcards ?? 0) * 2;

  /* Bonus */
  score += (this.bonus ?? 0) * 3;

  return Math.round(score);
});

/* ============================
   JSON settings
============================ */

playerSchema.set("toJSON", {
  virtuals: true,
  versionKey: false
});

export default mongoose.model("Player", playerSchema);
