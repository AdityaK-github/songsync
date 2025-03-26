import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Signup = ({ setToken }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://10.81.19.242:5137/api/auth/signup", { username, password });
      setToken(res.data.token);
      localStorage.setItem("token", res.data.token);
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <div>
      <h2>Sign up</h2>
      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Sign up</button>
    </div>
  );
};

export default Signup;
