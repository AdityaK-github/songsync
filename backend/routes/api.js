const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const fs = require("fs");
const path = require("path");

router.get("/stream/:songId", (req, res) => {
  const { songId } = req.params;
  const { startTime } = req.query; // Get start time from query
  const songPath = path.join(__dirname, "../songs", `${songId}.mp3`);

  if (!fs.existsSync(songPath)) {
    return res.status(404).send("Song not found");
  }

  const stat = fs.statSync(songPath);
  const fileSize = stat.size;

  // Optional: Get the bitrate to calculate byte offset
  const bitrate = 128 * 1024; // 128kbps (change based on actual audio bitrate)
  let startByte = 0;

  if (startTime) {
    const timeElapsed = parseFloat(startTime); // Convert to seconds
    startByte = Math.floor((bitrate / 8) * timeElapsed); // Calculate byte offset
    if (startByte > fileSize) startByte = 0; // Prevent seeking past file
  }

  res.writeHead(206, {
    "Content-Type": "audio/mpeg",
    "Content-Length": fileSize - startByte,
    "Accept-Ranges": "bytes",
    "Content-Range": `bytes ${startByte}-${fileSize - 1}/${fileSize}`
  });

  const stream = fs.createReadStream(songPath, { start: startByte });
  stream.pipe(res);
});



router.get("/user", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username FROM public.user WHERE id = $1",
      [req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ username: result.rows[0].username });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/create-room", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "INSERT INTO room (owner) VALUES ($1) RETURNING id",
      [req.user.userId]
    );
    const roomId = result.rows[0].id;

    await pool.query(
      "INSERT INTO room_user (user_id, room_id, role) VALUES ($1, $2, 'host')",
      [req.user.userId, roomId]
    );

    res.status(201).json({ message: "Room created", roomId });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/rooms", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, owner FROM room");
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/room-user", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT room_id, role FROM room_user WHERE user_id = $1",
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/join-room", authMiddleware, async (req, res) => {
  const { roomId } = req.body;

  if (!roomId) {
    return res.status(400).json({ error: "Room ID is required" });
  }

  try {
    await pool.query(
      "INSERT INTO room_user (user_id, room_id, role) VALUES ($1, $2, 'listener')",
      [req.user.userId, roomId]
    );

    res.json({ message: `User ${req.user.userId} joined Room ${roomId}` });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// router.post("/enqueue-song", authMiddleware, async (req, res) => {
//   const { roomId, songId } = req.body;

//   if (!roomId || !songId) {
//     return res.status(400).json({ error: "Room ID and Song ID are required" });
//   }

//   try {
//     const hostCheck = await pool.query(
//       "SELECT 1 FROM room_user WHERE user_id = $1 AND room_id = $2 AND role = 'host'",
//       [req.user.userId, roomId]
//     );

//     if (hostCheck.rowCount === 0) {
//       return res.status(403).json({ error: "Only the host can add songs" });
//     }

//     const orderResult = await pool.query(
//       "SELECT COALESCE(MAX(song_order), 0) + 1 AS next_order FROM room_song WHERE room_id = $1",
//       [roomId]
//     );
//     const nextOrder = orderResult.rows[0].next_order;

//     const insertResult = await pool.query(
//       "INSERT INTO room_song (song_id, room_id, song_order) VALUES ($1, $2, $3) RETURNING *",
//       [songId, roomId, nextOrder]
//     );

//     res.status(201).json({
//       message: "Song added to the room playlist",
//       song: insertResult.rows[0],
//     });
//   } catch (err) {
//     console.error("Database error:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

router.get("/room/:roomId/playlist", async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await pool.query(
      `SELECT rs.song_id, s.title, s.artist 
      FROM room_song rs 
      JOIN song s ON rs.song_id = s.id 
      WHERE rs.room_id = $1 ORDER BY rs.song_order`,
      [roomId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/songs", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, title, artist FROM song");
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get('refresh-token', async (req, res) => {
  try {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600; 
    const payload = {
      userId: req.user.userId,
      iat: iat,
      exp: exp
    };
    const token = jwt.sign(payload, secret);
    res.json({ token });
  } catch (err) {
    console.error("Error refreshing token:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
