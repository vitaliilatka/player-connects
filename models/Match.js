// models/Match.js
import mongoose from "mongoose";

/*
  Match schema
  ----------------
  Represents a single football match.
  This model is the PRIMARY SOURCE OF TRUTH
  for all player statistics and player connects.
*/

const goalSchema = new mongoose.Schema(
  {
    // Player who scored the goal
    scorer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },

    // Player who assisted (can be null)
    assist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      default: null
    },

    // Optional minute of the goal
    minute: {
      type: Number,
      min: 0,
      max: 130
    }
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    /* ============================
       Relations
    ============================ */

    // League this match belongs to
    league: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "League",
      required: true
    },

    // Matchday number (1–38)
    matchday: {
      type: Number,
      required: true,
      min: 1,
      max: 38
    },

    /* ============================
       Teams
    ============================ */

    homeTeam: {
      type: String,
      required: true,
      trim: true
    },

    awayTeam: {
      type: String,
      required: true,
      trim: true
    },

    /* ============================
       Final score
    ============================ */

    score: {
      home: {
        type: Number,
        default: 0
      },
      away: {
        type: Number,
        default: 0
      }
    },

    /* ============================
       Lineups & substitutions
    ============================ */

    lineups: {
      home: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player"
        }
      ],
      away: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player"
        }
      ]
    },

    subsIn: {
      home: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player"
        }
      ],
      away: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player"
        }
      ]
    },

    /* ============================
       Match events
    ============================ */

    events: {
      goals: [goalSchema],

      // Man of the Match
      motm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player",
        default: null
      }
    },

    /* ============================
       Match status
    ============================ */

    // Draft: editable
    // Finished: locked, stats can be calculated
    status: {
      type: String,
      enum: ["draft", "finished"],
      default: "draft"
    },

    /* ============================
       Meta
    ============================ */

    playedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/* ============================
   INDEXES
============================ */

// One match per league per matchday per teams
matchSchema.index(
  { league: 1, matchday: 1, homeTeam: 1, awayTeam: 1 },
  { unique: true }
);

export default mongoose.model("Match", matchSchema);
