import mongoose from "mongoose";

const matchdayWinnerSchema = new mongoose.Schema({

  matchday: {
    type: Number,
    required: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  points: {
    type: Number,
    default: 0
  }

});

const MatchdayWinner = mongoose.model("MatchdayWinner", matchdayWinnerSchema);

export default MatchdayWinner;