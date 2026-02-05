import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const playerPredictionSchema = new Schema({
  player: { type: Types.ObjectId, ref: "Player", required: true },
  position: { type: String, enum: ["gk", "def", "mid", "fw"], required: true }
});

const userPredictionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true },
    match: { type: Types.ObjectId, ref: "Match", required: true },
    team: { type: String, enum: ["home", "away"], required: true },
    players: [playerPredictionSchema],
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default model("UserPrediction", userPredictionSchema);
