import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// User schema: stores login credentials and user role
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },

  // Hashed password storage
  passwordHash: { type: String, required: true },

  // User permissions: regular user or admin
  role: { type: String, enum: ["user", "admin"], default: "user" }
});

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
