import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/* ============================
   POST /auth/register
   User registration
============================ */
router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "User with this username already exists" });
    }

    const user = new User({ username, role: role || "user" });
    await user.setPassword(password);
    await user.save();

    res.json({ message: "✅ User created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   POST /auth/login
   User login
============================ */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("🔹 Login success:", {
      id: user._id.toString(),
      username: user.username,
      role: user.role
    });

    res.json({
      token,
      role: user.role,
      userId: user._id.toString(),
      username: user.username
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login" });
  }
});

/* ============================
   GET /auth/me
   Token validation
============================ */
router.get("/me", async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("username role");

    res.json(user);
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

export default router;
