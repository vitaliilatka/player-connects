// routes/admin.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../utils/uploadConfig.js"; // memoryStorage


import League from "../models/League.js";
import Player from "../models/Player.js";

const router = express.Router();

/* ============================
   GET /admin/leagues
============================ */
router.get("/leagues", authMiddleware(), async (req, res) => {
  try {
    const leagues = await League.find({
      $or: [{ owner: req.user.id }, { admins: req.user.id }],
    });

    res.json(leagues);
  } catch (err) {
    console.error("League loading error:", err);
    res.status(500).json({ message: "Failed to load leagues" });
  }
});

/* ============================
   POST /admin/leagues
============================ */
router.post("/leagues", authMiddleware(), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "League name is required" });
    }

    const existing = await League.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "League already exists" });
    }

    const league = new League({
      name,
      owner: req.user.id,
      admins: [req.user.id],
      createdAt: new Date(),
    });

    await league.save();
    res.json(league);
  } catch (err) {
    console.error("League creation error:", err);
    res.status(500).json({ message: "Server error creating league" });
  }
});

/* ============================
   POST /admin/players
   Add new player + Cloudinary
============================ */
router.post(
  "/players",
  authMiddleware(),
  upload.single("image"), // MEMORY STORAGE
  async (req, res) => {
    try {
      const { name, team, position, leagueId } = req.body;

      if (!name || !team || !position || !leagueId) {
        return res
          .status(400)
          .json({ message: "All fields are required to add a player" });
      }

      const existing = await Player.findOne({ name, league: leagueId });
      if (existing) {
        return res
          .status(400)
          .json({ message: `Player "${name}" already exists in this league` });
      }

      const newPlayer = new Player({
        name,
        team,
        position,
        league: leagueId,
        image: req.file ? req.file.path : null, // ✅ Cloudinary URL
      });

      await newPlayer.save();
      res.status(201).json(newPlayer);
    } catch (err) {
      console.error("Player creation error:", err);
      res.status(500).json({ message: "Failed to add player" });
    }
  }
);

/* ============================
   GET /admin/players/:leagueId
============================ */
router.get("/players/:leagueId", authMiddleware(), async (req, res) => {
  try {
    const players = await Player.find({ league: req.params.leagueId });
    res.json(players);
  } catch (err) {
    console.error("Player loading error:", err);
    res.status(500).json({ error: "Failed to load players" });
  }
});

/* ============================
   PUT /admin/players/:id
   Update + Cloudinary image
============================ */

router.put("/players/:id", authMiddleware(), upload.single("image"), async (req, res) => {
  try {
    console.log("=== PUT /players/:id START ===");
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ message: "Player not found" });

    if (req.file) {
      console.log("Updating image to:", req.file.path);
      player.image = req.file.path;
    }

    // Только разрешённые поля
    const allowedFields = [
      "name", "team", "position", "games", "goals", "assists", "blocks",
      "saves", "cleansheets", "goalsconceded",
      "penalty_earned", "penalty_missed", "penalty_saved",
      "yellowcards", "redcards", "bonus"
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Преобразуем числа
        if (["games","goals","assists","blocks","saves","cleansheets","goalsconceded","penalty_earned","penalty_missed","penalty_saved","yellowcards","redcards","bonus"].includes(field)) {
          player[field] = Number(req.body[field]) || 0;
        } else {
          player[field] = req.body[field];
        }
      }
    });

    await player.save();
    console.log("=== Player updated successfully ===");
    res.json(player);
  } catch (err) {
    console.error("Player update error:", err);
    res.status(500).json({ message: "Failed to update player", error: err.message });
  }
});



// router.put(
//   "/players/:id",
//   authMiddleware(),
//   upload.single("image"), 
//   async (req, res) => {
//     try {
//       const player = await Player.findById(req.params.id);
//       if (!player) {
//         return res.status(404).json({ message: "Player not found" });
//       }

//       // 🔥 Update image if uploaded
//       if (req.file) {
//         player.image = req.file.path; // ✅ Cloudinary URL
//       }

//       // Merge the rest of body fields
//       Object.assign(player, req.body);

//       await player.save();
//       res.json(player);
//     } catch (err) {
//       console.error("Player update error:", err);
//       res.status(500).json({ message: "Failed to update player" });
//     }
//   }
// );

/* ============================
   DELETE /admin/players/:id
============================ */
router.delete("/players/:id", authMiddleware(), async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ message: "Player not found" });

    await player.deleteOne();

    res.json({ message: "Player deleted" });
  } catch (err) {
    console.error("Player deletion error:", err);
    res.status(500).json({ message: "Failed to delete player" });
  }
});

export default router;



// // routes/admin.js
// import express from "express";
// import { authMiddleware } from "../middleware/authMiddleware.js";
// import { upload } from "../utils/uploadConfig.js"; // memoryStorage


// import League from "../models/League.js";
// import Player from "../models/Player.js";

// const router = express.Router();

// // router.get("/ping", (req, res) => {
// //   res.json({
// //     ok: true,
// //     service: "player-connects-backend",
// //     time: new Date().toISOString(),
// //   });
// // });


// /* ============================
//    GET /admin/leagues
// ============================ */
// router.get("/leagues", authMiddleware(), async (req, res) => {
//   try {
//     const leagues = await League.find({
//       $or: [{ owner: req.user.id }, { admins: req.user.id }],
//     });

//     res.json(leagues);
//   } catch (err) {
//     console.error("League loading error:", err);
//     res.status(500).json({ message: "Failed to load leagues" });
//   }
// });

// /* ============================
//    POST /admin/leagues
// ============================ */
// router.post("/leagues", authMiddleware(), async (req, res) => {
//   try {
//     const { name } = req.body;

//     if (!name) {
//       return res.status(400).json({ message: "League name is required" });
//     }

//     const existing = await League.findOne({ name });
//     if (existing) {
//       return res.status(400).json({ message: "League already exists" });
//     }

//     const league = new League({
//       name,
//       owner: req.user.id,
//       admins: [req.user.id],
//       createdAt: new Date(),
//     });

//     await league.save();
//     res.json(league);
//   } catch (err) {
//     console.error("League creation error:", err);
//     res.status(500).json({ message: "Server error creating league" });
//   }
// });

// /* ============================
//    POST /admin/players
//    Add new player + Cloudinary
// ============================ */
// router.post(
//   "/players",
//   authMiddleware(),
//   upload.single("image"), // MEMORY STORAGE
//   async (req, res) => {
//     try {
//       const { name, team, position, leagueId } = req.body;

//       if (!name || !team || !position || !leagueId) {
//         return res
//           .status(400)
//           .json({ message: "All fields are required to add a player" });
//       }

//       const existing = await Player.findOne({ name, league: leagueId });
//       if (existing) {
//         return res
//           .status(400)
//           .json({ message: `Player "${name}" already exists in this league` });
//       }

//       const newPlayer = new Player({
//         name,
//         team,
//         position,
//         league: leagueId,
//         image: req.file ? req.file.path : null, // ✅ Cloudinary URL
//       });

//       await newPlayer.save();
//       res.status(201).json(newPlayer);
//     } catch (err) {
//       console.error("Player creation error:", err);
//       res.status(500).json({ message: "Failed to add player" });
//     }
//   }
// );

// /* ============================
//    GET /admin/players/:leagueId
// ============================ */
// router.get("/players/:leagueId", authMiddleware(), async (req, res) => {
//   try {
//     const players = await Player.find({ league: req.params.leagueId });
//     res.json(players);
//   } catch (err) {
//     console.error("Player loading error:", err);
//     res.status(500).json({ error: "Failed to load players" });
//   }
// });

// /* ============================
//    PUT /admin/players/:id
//    Update + Cloudinary image
// ============================ */

// router.put("/players/:id", authMiddleware(), upload.single("image"), async (req, res) => {
//   try {
//     console.log("req.body:", req.body);
//     console.log("req.file:", req.file);

//     const player = await Player.findById(req.params.id);
//     if (!player) return res.status(404).json({ message: "Player not found" });

//     if (req.file) {
//       console.log("Updating image to:", req.file.path);
//       player.image = req.file.path;
//     }

//     delete req.body.image;


//     Object.assign(player, req.body);
//     await player.save();
//     res.json(player);
//   } catch (err) {
//     console.error("Player update error:", err);
//     res.status(500).json({ message: "Failed to update player", error: err.message });
//   }
// });



// // router.put(
// //   "/players/:id",
// //   authMiddleware(),
// //   upload.single("image"), 
// //   async (req, res) => {
// //     try {
// //       const player = await Player.findById(req.params.id);
// //       if (!player) {
// //         return res.status(404).json({ message: "Player not found" });
// //       }

// //       // 🔥 Update image if uploaded
// //       if (req.file) {
// //         player.image = req.file.path; // ✅ Cloudinary URL
// //       }

// //       // Merge the rest of body fields
// //       Object.assign(player, req.body);

// //       await player.save();
// //       res.json(player);
// //     } catch (err) {
// //       console.error("Player update error:", err);
// //       res.status(500).json({ message: "Failed to update player" });
// //     }
// //   }
// // );

// /* ============================
//    DELETE /admin/players/:id
// ============================ */
// router.delete("/players/:id", authMiddleware(), async (req, res) => {
//   try {
//     const player = await Player.findById(req.params.id);
//     if (!player) return res.status(404).json({ message: "Player not found" });

//     await player.deleteOne();

//     res.json({ message: "Player deleted" });
//   } catch (err) {
//     console.error("Player deletion error:", err);
//     res.status(500).json({ message: "Failed to delete player" });
//   }
// });

// export default router;

