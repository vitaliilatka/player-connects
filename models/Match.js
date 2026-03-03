import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================
   LINEUP PLAYER
========================= */
const LineupPlayerSchema = new Schema(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },

    position: {
      type: String,
      enum: ["GK", "DEF", "MID", "FW"],
      required: true
    }
  },
  { _id: false }
);

/* =========================
   SUBSTITUTION
========================= */
const SubstitutionSchema = new Schema(
  {
    minute: {
      type: Number,
      required: true
    },

    playerOut: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },

    playerIn: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true
    }
  },
  { _id: false }
);

/* =========================
   GOAL
========================= */
const GoalSchema = new Schema(
  {
    scorer: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },

    assist: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      default: null
    },

    minute: {
      type: Number,
      required: true
    },

    ownGoal: {
      type: Boolean,
      default: false
    },

    penalty: {
      isPenalty: {
        type: Boolean,
        default: false
      },

      earnedBy: {
        type: Schema.Types.ObjectId,
        ref: "Player",
        default: null
      }
    }
  },
  { _id: false }
);

/* =========================
   MISSED PENALTY
========================= */
const MissedPenaltySchema = new Schema(
  {
    minute: {
      type: Number,
      required: true
    },

    takenBy: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },

    earnedBy: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      default: null
    }
  },
  { _id: false }
);

/* =========================
   CARD
========================= */
const CardSchema = new Schema(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },

    type: {
      type: String,
      enum: ["yellow", "red"],
      required: true
    },

    minute: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

/* =========================
   MATCH
========================= */
const MatchSchema = new Schema(
  {
    league: {
      type: Schema.Types.ObjectId,
      ref: "League",
      required: true,
      index: true
    },

    matchday: {
      type: Number,
      required: true,
      index: true
    },

    kickoff: {
      type: Date,
      required: true,
      index: true
    },

    homeTeam: {
      type: String,
      required: true
    },

    awayTeam: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["scheduled", "draft", "live", "finished"],
      default: "scheduled",
      index: true
    },

    processed: {
      type: Boolean,
      default: false
    },

    score: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 }
    },

    /* =========================
       LINEUPS
    ========================= */
    lineups: {
      home: { type: [LineupPlayerSchema], default: [] },
      away: { type: [LineupPlayerSchema], default: [] }
    },

    /* =========================
       SUBSTITUTIONS
    ========================= */
    substitutions: {
      home: { type: [SubstitutionSchema], default: [] },
      away: { type: [SubstitutionSchema], default: [] }
    },

    /* =========================
       EVENTS
    ========================= */
    events: {
      goals: {
        home: { type: [GoalSchema], default: [] },
        away: { type: [GoalSchema], default: [] }
      },

      missedPenalties: {
        home: { type: [MissedPenaltySchema], default: [] },
        away: { type: [MissedPenaltySchema], default: [] }
      },

      cards: {
        home: { type: [CardSchema], default: [] },
        away: { type: [CardSchema], default: [] }
      },

      motm: {
        type: Schema.Types.ObjectId,
        ref: "Player",
        default: null
      }
    }
  },
  { timestamps: true }
);

/* =========================
   INDEXES
========================= */

// Быстрая сортировка по туру
MatchSchema.index({ league: 1, matchday: 1 });

// Быстрая сортировка по дате
MatchSchema.index({ league: 1, kickoff: 1 });

// Чтобы нельзя было создать один и тот же матч дважды
MatchSchema.index(
  { league: 1, matchday: 1, homeTeam: 1, awayTeam: 1 },
  { unique: true }
);

export default mongoose.model("Match", MatchSchema);

