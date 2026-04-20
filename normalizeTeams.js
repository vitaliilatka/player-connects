// normalizeTeams.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Player from "./models/Player.js";
import Match from "./models/Match.js";

dotenv.config();

function normalize(name) {
  return name
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // ===== PLAYERS =====
    const players = await Player.find();

    for (const p of players) {
      const fixed = normalize(p.team);

      if (p.team !== fixed) {
        console.log(`Player: ${p.team} → ${fixed}`);
        p.team = fixed;
        await p.save();
      }
    }

    // ===== MATCHES =====
    const matches = await Match.find();

    for (const m of matches) {
      const homeFixed = normalize(m.homeTeam);
      const awayFixed = normalize(m.awayTeam);

      if (m.homeTeam !== homeFixed || m.awayTeam !== awayFixed) {
        console.log(`Match: ${m.homeTeam} vs ${m.awayTeam}`);
        console.log(`→ ${homeFixed} vs ${awayFixed}`);

        m.homeTeam = homeFixed;
        m.awayTeam = awayFixed;

        await m.save();
      }
    }

    console.log("🔥 DONE");

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

run();