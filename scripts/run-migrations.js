import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 30000,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔄 Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database');

        // Create migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Migrations" (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        // Get all SQL files from migrations folder
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            console.log('⚠️ Migrations folder not found');
            return;
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`📁 Found ${files.length} migration files`);

        let appliedCount = 0;
        let skippedCount = 0;

        for (const file of files) {
            // Check if migration already applied
            const result = await client.query(
                'SELECT id FROM "Migrations" WHERE name = $1',
                [file]
            );

            if (result.rows.length > 0) {
                console.log(`⏭️  Skipping ${file} (already applied)`);
                skippedCount++;
                continue;
            }

            console.log(`🔄 Applying ${file}...`);
            
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO "Migrations" (name) VALUES ($1)',
                    [file]
                );
                console.log(`✅ Applied ${file}`);
                appliedCount++;
            } catch (err) {
                console.error(`❌ Failed to apply ${file}:`, err.message);
                throw err;
            }
        }

        console.log(`📊 Summary: ${appliedCount} applied, ${skippedCount} skipped`);
        console.log('✅ Migration script completed');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

// Run migrations
runMigrations()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration script failed:', error.message);
        process.exit(1);
    });