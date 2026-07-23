import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

// Test database connection
(async () => {
  try {
    const client = await pool.connect();

    console.log("✅ PostgreSQL connected successfully.");

    client.release();
  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL.");
    console.error(error.message);

    // Exit in production if the DB is unavailable
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
})();

export default pool;