import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";

const token = localStorage.getItem("token");
const socket = io("ws://10.81.19.242:5137", {
  auth: { token },
});

axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

const Room = () => {
  const { id: roomId } = useParams();
  const [queue, setQueue] = useState([]);
  const [currentSongId, setCurrentSongId] = useState(null);
  const [songs, setSongs] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  const handleUpdateQueue = (newSong) => {
    setQueue((prevQueue) => [...prevQueue, newSong]);
  };

  useEffect(() => {
    socket.on("connect", () => console.log("✅ Socket connected"));
    socket.on("connect_error", (error) =>
      console.error("❌ Socket error:", error)
    );
    return () => {
      socket.off("connect");
      socket.off("connect_error");
    };
  }, []);

  useEffect(() => {
    socket.emit("join-room", roomId);

    socket.on("update-queue", handleUpdateQueue);

    axios
      .get(`http://10.81.19.242:5137/api/room/${roomId}/playlist`)
      .then((res) => setQueue(res.data))
      .catch((err) => {
        if(err.response?.status === 401) {
          const refreshToken = axios.get(`http://10.81.19.242:5137/api/refresh-token`);
          localStorage.setItem("token", refreshToken.data.token);
        } else {
          console.error("Error fetching queue:", err);
        }
      });

    return () => {
      socket.off("update-queue", handleUpdateQueue);
    };
  }, [roomId]);

  useEffect(() => {
    axios
      .get("http://10.81.19.242:5137/api/songs")
      .then((res) => setSongs(res.data))
      .catch((err) => console.error("Error fetching songs:", err));
  }, []);

  const handlePlaySongResponse = useCallback(async ({ songUrl }) => {
    try {
      const response = await fetch(songUrl);
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      if (audioRef.current) {
        audioRef.current.src = url;
        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.error("🔇 Autoplay blocked:", err);
            audioRef.current
              .play()
              .then(() => {
                audioRef.current.muted = false;
              })
              .catch((muteErr) => {
                console.error("🔇 Muted autoplay failed:", muteErr);
              });
          });
        }
      }
    } catch (err) {
      console.error("Error fetching audio:", err);
    }
  }, []);

  useEffect(() => {
    socket.on("start-song", handlePlaySongResponse);
    return () => socket.off("start-song", handlePlaySongResponse);
  }, [handlePlaySongResponse]);

  const handlePlaySong = (songId) => {
    socket.emit("start-song", { roomId, songId });
    setCurrentSongId(songId);
  };

  const enqueueSong = (songId) => {
    socket.emit("song-enqueued", roomId, songId);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Room: {roomId}</h1>

      <div style={styles.section}>
        <h2>Now Playing</h2>
        {currentSongId ? (
          <p>
            {songs.find((song) => song.id === currentSongId)?.title ||
              "Loading..."}
          </p>
        ) : (
          <p>No song playing</p>
        )}
        <audio ref={audioRef} controls autoPlay></audio>{" "}
      </div>

      {/* Queue Section */}
      <div style={styles.section}>
        <h2>Queue</h2>
        {queue.length > 0 ? (
          queue.map((song, index) => (
            <div key={`${song.id}-${index}`} style={styles.songItem}>
              <p>
                {song.title} - {song.artist}
              </p>
              <button
                onClick={() => handlePlaySong(song.song_id)}
                style={styles.button}
              >
                Play
              </button>
            </div>
          ))
        ) : (
          <p>Queue is empty</p>
        )}
      </div>

      {/* Available Songs Section */}
      <div style={styles.section}>
        <h2>Available Songs</h2>
        {songs.map((song, index) => (
          <div key={`${song.id}-${index}`} style={styles.songItem}>
            <p>
              {song.title} - {song.artist}
            </p>
            <button onClick={() => enqueueSong(song.id)} style={styles.button}>
              Enqueue
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    textAlign: "center",
    backgroundColor: "#1a1a1a",
    color: "white",
    height: "100vh",
    overflow: "auto",
  },
  title: { fontSize: "2rem", marginBottom: "10px" },
  section: {
    marginBottom: "20px",
    backgroundColor: "#2a2a2a",
    padding: "10px",
    borderRadius: "5px",
  },
  songItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    backgroundColor: "#333",
    borderRadius: "5px",
    marginBottom: "10px",
  },
  button: {
    backgroundColor: "#007bff",
    color: "white",
    padding: "5px 10px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default Room;
