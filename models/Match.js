import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================
   Состав игрока
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
    },
    fromMinute: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

/* =========================
   Гол
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
      default: null
    }
  },
  { _id: false }
);

/* =========================
   Матч
========================= */
const MatchSchema = new Schema(
  {
    league: {
      type: Schema.Types.ObjectId,
      ref: "League",
      required: true
    },

    matchday: {
      type: Number,
      required: true
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
      enum: ["draft", "live", "finished"],
      default: "draft"
    },

    processed: {
      type: Boolean,
      default: false
    },

    playedAt: {
      type: Date,
      default: Date.now
    },

    score: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 }
    },

    /* =========================
       Составы
    ========================= */
    lineups: {
      home: [LineupPlayerSchema],
      away: [LineupPlayerSchema]
    },

    /* =========================
       Замены
    ========================= */
    subsIn: {
      home: [
        {
          player: { type: Schema.Types.ObjectId, ref: "Player" },
          minute: Number
        }
      ],
      away: [
        {
          player: { type: Schema.Types.ObjectId, ref: "Player" },
          minute: Number
        }
      ]
    },

    /* =========================
       События
    ========================= */
    events: {
      goals: {
        home: [GoalSchema],
        away: [GoalSchema]
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

export default mongoose.model("Match", MatchSchema);

