import mongoose from "mongoose";

const { Schema } = mongoose;

/*
  TeamSquad — это список игроков команды.
  НЕ дублирует игроков, а ссылается на Player через ObjectId
*/
const TeamSquadSchema = new Schema(
  {
    // Название команды (например: Liverpool)
    team: {
      type: String,
      required: true,
      unique: true, // одна команда — один squad
      trim: true
    },

    // Список игроков команды
    players: [
      {
        type: Schema.Types.ObjectId,
        ref: "Player",
        required: true
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model("TeamSquad", TeamSquadSchema);
