import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

/* =========================
   Старт
========================= */
const playerPredictionSchema = new Schema(
  {
    player: {
      type: Types.ObjectId,
      ref: "Player",
      required: true
    },
    position: {
      type: String,
      enum: ["gk", "def", "mid", "fw"],
      required: true
    }
  },
  { _id: false }
);

/* =========================
   Замены
========================= */
const subPredictionSchema = new Schema(
  {
    player: {
      type: Types.ObjectId,
      ref: "Player",
      required: true
    },
    minute: {
      type: Number,
      default: null
    }
  },
  { _id: false }
);

/* =========================
   Гол в прогнозе
========================= */
const goalPredictionSchema = new Schema(
  {
    scorer: {
      type: Types.ObjectId,
      ref: "Player",
      required: true
    },
    assist: {
      type: Types.ObjectId,
      ref: "Player",
      default: null
    }
  },
  { _id: false }
);

/* =========================
   Прогноз
========================= */
const userPredictionSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true
    },

    match: {
      type: Types.ObjectId,
      ref: "Match",
      required: true
    },

    team: {
      type: String,
      enum: ["home", "away"],
      required: true
    },

    players: {
      type: [playerPredictionSchema],
      required: true
    },

    subs: {
      type: [subPredictionSchema],
      default: []
    },

    goals: {
      type: [goalPredictionSchema],
      default: []
    },

    predictedScore: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 }
    },

    motm: {
      type: Types.ObjectId,
      ref: "Player",
      default: null
    },

    points: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default model("UserPrediction", userPredictionSchema);
