import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Detect if connecting to localhost vs remote hosted database
const isLocalhost =
  process.env.DATABASE_URL?.includes("localhost") ||
  process.env.DATABASE_URL?.includes("127.0.0.1");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Use SSL for remote DBs (Render/Neon/Supabase) even during local dev, disable for local Postgres
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

(async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected successfully.");
    client.release();
  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL:");
    console.error(error.message);
  }
})();

export default pool;
