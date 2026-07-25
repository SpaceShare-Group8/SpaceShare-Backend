import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Conditionally configure SSL based on environment or URL
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? {
        rejectUnauthorized: false,
      }
    : false,
});

// Global error listener for backend database pool failures
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

// Test database connection on startup
(async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected successfully.");
    client.release();
  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL:");
    console.error(error.message);

    // Fail-fast in production if database is unreachable
    if (isProduction) {
      process.exit(1);
    }
  }
})();

export default pool;
