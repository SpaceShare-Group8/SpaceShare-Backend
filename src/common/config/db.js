import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

// Test database connection
(async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected successfully.");
  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL.");
    console.error(error.message);

    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
})();

export default pool;