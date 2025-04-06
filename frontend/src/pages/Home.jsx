import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Socket } from "socket.io-client";

const socket = new Socket("ws://10.81.92.209:5137", {
  auth: { token: localStorage.getItem("token") },
});

const Home = () => {
  const [roomId, setRoomId] = useState("");
  const [rooms, setRooms] = useState([]);
  const [username, setUsername] = useState("Guest");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUserData = async () => {
      try {
        const [roomsRes, userRes] = await Promise.all([
          axios.get("http://10.81.92.209:5137/api/room-user", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://10.81.92.209:5137/api/user", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setRooms(roomsRes.data);
        setUsername(userRes.data.username || "Guest");
      } catch (err) {
        console.error("Error fetching data:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/login");
        }
      }
    };

    fetchUserData();
  }, [navigate]);

  const createRoom = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await axios.post(
        "http://10.81.92.209:5137/api/create-room",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error("Error creating room:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/login");
      }
    }
  };

  const joinRoom = async () => {
    if (!roomId.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      await axios.post(
        "http://10.81.92.209:5137/api/join-room",
        { roomId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/room/${roomId}`);
      socket.emit("join-room", roomId);
    } catch (err) {
      console.error("Error joining room:", err);
      alert("Failed to join room. Please check the Room ID.");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Music Sync</h1>
      <h2 style={styles.subtitle}>Welcome, {username}</h2>

      <button onClick={createRoom} style={styles.button}>
        Create Room
      </button>

      <input
        type="text"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={styles.input}
      />
      <button onClick={joinRoom} style={styles.button}>
        Join Room
      </button>

      <h2 style={styles.subtitle}>Your Rooms</h2>
      <ul style={styles.roomList}>
        {rooms.length > 0 ? (
          rooms.map((room) => (
            <li key={room.room_id} style={styles.roomItem}>
              <span>
                Room ID: {room.room_id} (Role: {room.role})
              </span>
              <button
                onClick={() => navigate(`/room/${room.room_id}`)}
                style={styles.joinButton}
              >
                Enter
              </button>
            </li>
          ))
        ) : (
          <p>No rooms found.</p>
        )}
      </ul>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#1a1a1a",
    color: "white",
  },
  title: { fontSize: "2rem", marginBottom: "20px" },
  subtitle: { fontSize: "1.5rem", marginTop: "20px", color: "green" },
  button: {
    backgroundColor: "#007bff",
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    marginBottom: "10px",
    cursor: "pointer",
  },
  input: {
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "10px",
    width: "200px",
  },
  roomList: { listStyleType: "none", padding: "0", marginTop: "20px" },
  roomItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#333",
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "5px",
    width: "300px",
  },
  joinButton: {
    backgroundColor: "#28a745",
    color: "white",
    padding: "5px 10px",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default Home;
