const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";

router.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const userExists = await pool.query(
      "SELECT * FROM public.user WHERE username = $1",
      [username]
    );
    if (userExists.rowCount > 0)
      return res.status(400).json({ error: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO public.user (username, password) VALUES ($1, $2) RETURNING id",
      [username, hashedPassword]
    );

    const token = jwt.sign({ userId: result.rows[0].id }, SECRET_KEY, {
      expiresIn: "1h",
    });
    res.json({ message: "User registered", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// User Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const result = await pool.query("SELECT * FROM public.user WHERE username = $1", [
      username,
    ]);
    if (result.rowCount === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id }, SECRET_KEY, {
      expiresIn: "1h",
    });
    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
