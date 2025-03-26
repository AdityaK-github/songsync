const pool = require("./db");

async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Database Time:", res.rows[0]);
  } catch (err) {
    console.error("Database connection failed", err);
  } finally {
    pool.end(); // Close connection after test
  }
}

testConnection();
