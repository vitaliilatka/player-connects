// models/Player.js
import mongoose from "mongoose";

// Player schema: stores all player statistics and metadata
const playerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  team: { type: String, default: "" },

  // Relation: player belongs to a league
  league: { type: mongoose.Schema.Types.ObjectId, ref: "League", required: true },

  position: { type: String, required: true },

  // Player statistics
  games: { type: Number, default: 0 },
  goals: { type: Number, default: 0 },
  assists: { type: Number, default: 0 },
  blocks: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  cleansheets: { type: Number, default: 0 },
  goalsconceded: { type: Number, default: 0 },

  // Penalty-related statistics
  penalty_earned: { type: Number, default: 0 },
  penalty_missed: { type: Number, default: 0 },
  penalty_saved: { type: Number, default: 0 },

  // Discipline
  yellowcards: { type: Number, default: 0 },
  redcards: { type: Number, default: 0 },

  // Bonus points
  bonus: { type: Number, default: 0 },

  // Player image (url or base64)
  image: { type: String, default: "" },
});

// Automatic rating calculated by formula
playerSchema.virtual("rating").get(function () {
  return Math.round(
    (this.games ?? 0) * 2 +
    (this.goals ?? 0) * 4 +
    (this.assists ?? 0) * 3 +
    (this.cleansheets ?? 0) * 4 +
    (this.saves ?? 0) +
    (this.blocks ?? 0) +
    (this.penalty_earned ?? 0) * 2 +
    (this.penalty_saved ?? 0) * 4 +
    (this.bonus ?? 0) * 3 -
    (this.goalsconceded ?? 0) -
    (this.penalty_missed ?? 0) * 2 -
    (this.yellowcards ?? 0) -
    (this.redcards ?? 0) * 2
  );
});

// Include virtual fields (e.g., rating) in JSON responses
playerSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Player", playerSchema);
