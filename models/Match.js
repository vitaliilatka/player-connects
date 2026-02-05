import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================
   Схема игрока в составе
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
      enum: ["gk", "def", "mid", "fw"],
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
   Схема матча
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

    playedAt: {
      type: Date,
      default: Date.now
    },

    score: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 }
    },

    /* =========================
       ФАКТИЧЕСКИЕ СОСТАВЫ
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
          player: {
            type: Schema.Types.ObjectId,
            ref: "Player"
          },
          minute: Number
        }
      ],
      away: [
        {
          player: {
            type: Schema.Types.ObjectId,
            ref: "Player"
          },
          minute: Number
        }
      ]
    },

    /* =========================
       События матча
    ========================= */
    events: {
      goals: [
        {
          player: {
            type: Schema.Types.ObjectId,
            ref: "Player"
          },
          minute: Number
        }
      ],
      motm: {
        type: Schema.Types.ObjectId,
        ref: "Player",
        default: null
      }
    },
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Match", MatchSchema);
