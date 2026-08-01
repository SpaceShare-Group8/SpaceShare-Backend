#!/usr/bin/env node

/**
 * Migration Runner
 * Usage:
 *   node src/common/config/migrate.js          # Run all pending migrations
 *   node src/common/config/migrate.js create   # Create a new migration file
 *   node src/common/config/migrate.js status   # Check migration status
 *   node src/common/config/migrate.js rollback # Rollback last migration
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runMigrations } from "./db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, "../../../migrations");

// Ensure migrations directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  console.log(`📁 Created migrations directory: ${MIGRATIONS_DIR}`);
}

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0] || "migrate";
const migrationName = args[1];

/**
 * Create a new migration file
 */
const createMigration = (name) => {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 14);
  const fileName = `${timestamp}_${name || "migration"}.sql`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);

  const template = `-- ================================================================
-- MIGRATION: ${fileName}
-- Description: ${name || "Migration description"}
-- Created: ${new Date().toISOString()}
-- ================================================================

-- Write your migration SQL here
-- For example:
-- CREATE TABLE ...;
-- ALTER TABLE ...;
-- INSERT INTO ...;

-- ================================================================
-- ROLLBACK
-- ================================================================
-- Write your rollback SQL here
-- For example:
-- DROP TABLE ...;
`;

  fs.writeFileSync(filePath, template);
  console.log(`✅ Created migration: ${filePath}`);
};

/**
 * Show migration status
 */
const showStatus = async () => {
  console.log("📊 Migration Status");
  console.log("=" .repeat(40));

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("📋 No migration files found.");
    return;
  }

  console.log(`📁 Found ${files.length} migration files:\n`);

  // Get applied migrations from database
  const { default: pool } = await import("./db.js");
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL
      );
    `);

    const result = await client.query(
      "SELECT name, applied_at FROM migrations ORDER BY id"
    );
    const applied = new Map(result.rows.map(r => [r.name, r.applied_at]));

    console.log("┌─────────────┬──────────────────────────────────────┐");
    console.log("│ Status      │ Migration File                       │");
    console.log("├─────────────┼──────────────────────────────────────┤");

    let pendingCount = 0;
    let appliedCount = 0;

    for (const file of files) {
      const isApplied = applied.has(file);
      const status = isApplied ? "✅ Applied" : "⏳ Pending";
      const padding = " ".repeat(12 - status.length);
      
      if (isApplied) {
        appliedCount++;
      } else {
        pendingCount++;
      }

      console.log(`│ ${status}${padding}│ ${file.padEnd(36)}│`);
    }

    console.log("└─────────────┴──────────────────────────────────────┘");
    console.log(`\n📊 Summary: ${appliedCount} applied, ${pendingCount} pending`);

  } finally {
    client.release();
    await pool.end();
  }
};

/**
 * Rollback last migration
 */
const rollbackMigration = async () => {
  console.log("⏪ Rolling back last migration...");

  const { default: pool } = await import("./db.js");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get last migration
    const result = await client.query(
      "SELECT name FROM migrations ORDER BY id DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      console.log("📋 No migrations to rollback.");
      await client.query("COMMIT");
      return;
    }

    const migrationName = result.rows[0].name;
    console.log(`⏪ Rolling back: ${migrationName}`);

    // Delete from migrations table
    await client.query("DELETE FROM migrations WHERE name = $1", [migrationName]);

    await client.query("COMMIT");

    console.log(`✅ Rollback successful: ${migrationName}`);

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Rollback failed:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
};

/**
 * Main execution
 */
const main = async () => {
  try {
    switch (command) {
      case "create":
        createMigration(migrationName);
        break;

      case "status":
        await showStatus();
        break;

      case "rollback":
        await rollbackMigration();
        break;

      case "migrate":
      default:
        console.log("🔄 Running migrations...");
        const result = await runMigrations();
        console.log("\n📊 Migration Summary:");
        console.log(`   Applied: ${result.applied}`);
        console.log(`   Total: ${result.totalMigrations}`);
        console.log(`   Message: ${result.message}`);
        break;
    }
  } catch (error) {
    console.error("❌ Migration command failed:", error.message);
    process.exit(1);
  }
};

main();