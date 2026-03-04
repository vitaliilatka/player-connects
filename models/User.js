import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// User schema: stores login credentials, selected team and ranking data
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },

  // Hashed password storage
  passwordHash: { 
    type: String, 
    required: true 
  },

  // User permissions: regular user or admin
  role: { 
    type: String, 
    enum: ["user", "admin"], 
    default: "user" 
  },

  /* =========================
     SEASON SELECTION
  ========================= */

  // Team selected for the whole season (can be chosen only once)
  selectedTeam: {
    type: String,
    default: null
  },

  /* =========================
     RATING DATA
  ========================= */

  // Total points for the whole season
  totalPoints: {
    type: Number,
    default: 0
  },

  // Overall ranking position
  ratingPosition: {
    type: Number,
    default: 0
  },

  // Points scored in the last processed matchday
  lastMatchdayPoints: {
    type: Number,
    default: 0
  },

  // Position in the last matchday ranking
  lastMatchdayPosition: {
    type: Number,
    default: 0
  }
});

/* =========================
   PASSWORD METHODS
========================= */

// Set password: hashes plain-text password before saving
userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

// Compare input password with stored hash
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.passwordHash);
};

const User = mongoose.model("User", userSchema);
export default User;


// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";

// // User schema: stores login credentials and user role
// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true, unique: true },

//   // Hashed password storage
//   passwordHash: { type: String, required: true },

//   // User permissions: regular user or admin
//   role: { type: String, enum: ["user", "admin"], default: "user" }
// });

// // Set password: hashes plain-text password before saving
// userSchema.methods.setPassword = async function (password) {
//   this.passwordHash = await bcrypt.hash(password, 10);
// };

// // Compare input password with stored hash
// userSchema.methods.comparePassword = async function (password) {
//   return await bcrypt.compare(password, this.passwordHash);
// };




// const User = mongoose.model("User", userSchema);
// export default User;
