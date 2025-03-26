const pool = require("./db");

const songs = [
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Shape of You", artist: "Ed Sheeran" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "Peaches", artist: "Justin Bieber" },
  { title: "Save Your Tears", artist: "The Weeknd" }
];

const seedSongs = async () => {
  try {
    for (let song of songs) {
      await pool.query("INSERT INTO song (title, artist) VALUES ($1, $2)", [
        song.title,
        song.artist
      ]);
    }
    console.log("✅ Songs inserted successfully!");
  } catch (err) {
    console.error("❌ Error inserting songs:", err);
  } finally {
    pool.end(); // Close DB connection
  }
};

seedSongs();
