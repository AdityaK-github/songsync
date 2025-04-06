const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./db");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const ss = require("socket.io-stream");

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/songs", express.static(path.join(__dirname, "songs")));

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("No token provided"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("Invalid token"));
    }
    socket.user = decoded;
    next();
  });
});

const roomState = {};

io.on("connection", (socket) => {
  console.info(`✅ User connected: ${socket.id}`);

  socket.on("start-song", ({ roomId, songId }) => {
    if (!roomId || !songId) return;
    console.info(`🎵 Playing song in Room ${roomId}: Song ID ${songId}`);

    const songPath = path.join(__dirname, "songs", `${songId}.mp3`);
    if (fs.existsSync(songPath)) {
      io.to(roomId).emit("start-song", {
        songUrl: `http://10.81.92.209:5137/songs/${songId}.mp3`,
      });
    } else {
      socket.emit("error", { message: `Song file not found: ${songId}.mp3` });
    }
  });

  socket.on("play-song", ({ roomId, songId }) => {
    if (!roomId || !songId) return;

    const startTime = Date.now(); // Record when the song starts
    roomState[roomId] = { songId, startTime }; // Store in room state

    console.info(`🎶 Broadcasting song ${songId} in Room ${roomId}`);
    io.to(roomId).emit("play-song", { songId, startTime });
  });

  socket.on("join-room", (roomId) => {
    if (!roomId) return;
    console.info(`🔹 User ${socket.id} joined room ${roomId}`);
    socket.join(roomId);

    // If a song is already playing in this room, sync the new user
    if (roomState[roomId]) {
      console.info(`🔄 Syncing new user ${socket.id} to Room ${roomId}`);
      socket.emit("play-song", roomState[roomId]);
    }
  });

  socket.on("sync-playback", ({ roomId, state }) => {
    if (!roomId || !state) return;
    console.info(`🔄 Syncing playback in Room ${roomId}: ${state}`);
    io.to(roomId).emit("update-playback", state);
  });

  socket.on("song-enqueued", async (roomId, songId) => {
    if (!roomId || !songId) return;
    try {
      const { rows } = await pool.query(
        "SELECT COALESCE(MAX(song_order), 0) + 1 AS next_order FROM room_song WHERE room_id = $1",
        [roomId]
      );

      const songOrder = rows[0]?.next_order || 1;

      const { rows: inserted } = await pool.query(
        "INSERT INTO room_song (room_id, song_id, song_order) VALUES ($1, $2, $3) RETURNING *",
        [roomId, songId, songOrder]
      );

      const { rows: song_added } = await pool.query(
        "SELECT * FROM song WHERE id = $1",
        [songId]
      );

      console.log(song_added);
      io.to(roomId).emit("update-queue", song_added[0]);
    } catch (err) {
      console.error("❌ Error inserting into room_song:", err);
    }
  });

  socket.on("disconnect", () => {
    console.warn(`❌ User disconnected: ${socket.id}`);
    socket.rooms.forEach((room) => socket.leave(room));
  });
});

const PORT = process.env.PORT || 5137;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
