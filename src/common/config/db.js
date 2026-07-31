import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pg;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect if connecting to localhost vs remote hosted database
const isLocalhost =
  process.env.DATABASE_URL?.includes("localhost") ||
  process.env.DATABASE_URL?.includes("127.0.0.1");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Use SSL for remote DBs (Render) even during local dev, disable for local Postgres
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

/**
 * Run database migrations from the migrations folder
 * @param {boolean} force - Force run migrations even if already applied
 * @returns {Promise<Object>} - Migration results
 */
export const runMigrations = async (force = false) => {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL
      );
    `);

    // Get list of already applied migrations
    const appliedResult = await client.query(
      "SELECT name FROM migrations ORDER BY id"
    );
    const appliedMigrations = new Set(appliedResult.rows.map(row => row.name));

    // Get migration files from migrations folder
    const migrationsDir = path.join(__dirname, "../../../migrations");
    
    if (!fs.existsSync(migrationsDir)) {
      console.log("📁 No migrations folder found. Creating one...");
      fs.mkdirSync(migrationsDir, { recursive: true });
      return { applied: 0, message: "Migrations folder created" };
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith(".sql"))
      .sort(); // Sort to ensure order

    if (migrationFiles.length === 0) {
      console.log("📋 No migration files found.");
      return { applied: 0, message: "No migrations to apply" };
    }

    let appliedCount = 0;
    const appliedMigrationsList = [];

    for (const file of migrationFiles) {
      if (!force && appliedMigrations.has(file)) {
        console.log(`⏭️  Skipping already applied migration: ${file}`);
        continue;
      }

      try {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, "utf8");
        
        // Calculate checksum for tracking
        const checksum = require("crypto")
          .createHash("sha256")
          .update(sql)
          .digest("hex");

        // Execute the migration
        console.log(`🔄 Applying migration: ${file}...`);
        await client.query(sql);

        // Record the migration
        await client.query(
          `INSERT INTO migrations (name, checksum) VALUES ($1, $2)`,
          [file, checksum]
        );

        appliedCount++;
        appliedMigrationsList.push(file);
        console.log(`✅ Applied migration: ${file}`);

      } catch (error) {
        console.error(`❌ Failed to apply migration ${file}:`, error.message);
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }

    await client.query("COMMIT");

    if (appliedCount === 0) {
      console.log("📋 All migrations are up to date.");
    } else {
      console.log(`✅ Successfully applied ${appliedCount} migration(s):`);
      appliedMigrationsList.forEach(name => console.log(`   - ${name}`));
    }

    return {
      applied: appliedCount,
      appliedMigrations: appliedMigrationsList,
      totalMigrations: migrationFiles.length,
      message: appliedCount > 0 ? "Migrations applied successfully" : "All migrations up to date"
    };

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Auto-run migrations on startup (optional - disable in production)
const shouldAutoMigrate = process.env.AUTO_MIGRATE === "true";

(async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected successfully.");
    client.release();

    // Run migrations if AUTO_MIGRATE is enabled
    if (shouldAutoMigrate) {
      console.log("🔄 Auto-migrate enabled, running migrations...");
      await runMigrations();
    }

  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL:");
    console.error(error.message);
  }
})();

export default pool;