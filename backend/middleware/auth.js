require("dotenv").config();

const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  console.error("JWT secret key not set");
  process.exit(1);
}

module.exports = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ error: "Access denied" });
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified;
    next();
  } catch (err) {
    console.log("Invalid token:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};
