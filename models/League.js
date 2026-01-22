import mongoose from "mongoose";

// League schema: stores league information and its relation to users
const leagueSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },

  // The user who created the league (owner)
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  // Additional admins who can manage the league
  admins: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],

  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const League = mongoose.model("League", leagueSchema);

export default League;
