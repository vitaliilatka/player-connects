import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

/* =========================
   Стартовый состав (11)
========================= */
const playerPredictionSchema = new Schema(
  {
    player: {
      type: Types.ObjectId,
      ref: "Player",
      required: true,
    },
    position: {
      type: String,
      enum: ["gk", "def", "mid", "fw"],
      required: true,
    },
  },
  { _id: false }
);

/* =========================
   Замены (до 5)
========================= */
const subPredictionSchema = new Schema(
  {
    player: {
      type: Types.ObjectId,
      ref: "Player",
      required: true,
    },
    minute: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

/* =========================
   Прогноз пользователя
========================= */
const userPredictionSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    match: {
      type: Types.ObjectId,
      ref: "Match",
      required: true,
    },

    team: {
      type: String,
      enum: ["home", "away"],
      required: true,
    },

    players: {
      type: [playerPredictionSchema],
      required: true,
    },

    subs: {
      type: [subPredictionSchema],
      default: [],
    },

    motm: {
      type: Types.ObjectId,
      ref: "Player",
      default: null,
    },

    points: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default model("UserPrediction", userPredictionSchema);
