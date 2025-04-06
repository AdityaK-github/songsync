import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

const Login = ({ setToken }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Get the original URL the user tried to visit before being redirected to login
  const from = location.state?.from?.pathname || "/";

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://10.81.92.209:5137/api/auth/login", {
        username,
        password,
      });

      // Save token
      setToken(res.data.token);
      localStorage.setItem("token", res.data.token);

      // Redirect the user back to the original page
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};

export default Login;
