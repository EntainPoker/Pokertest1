import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
}

async function getExecutedMigrations(): Promise<string[]> {
  const result = await pool.query('SELECT filename FROM schema_migrations ORDER BY filename');
  return result.rows.map((row: { filename: string }) => row.filename);
}

async function getMigrationFiles(): Promise<string[]> {
  const files = fs.readdirSync(__dirname);
  return files
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export async function runMigrations() {
  await ensureMigrationsTable();

  const executed = await getExecutedMigrations();
  const files = await getMigrationFiles();
  const pending = files.filter((f) => !executed.includes(f));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  for (const file of pending) {
    const filePath = path.join(__dirname, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Running migration: ${file}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ✓ ${file} applied successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`  ✗ ${file} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(`Applied ${pending.length} migration(s).`);
}

// Run migrations if executed directly
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('migrations/index.ts') ||
  process.argv[1].endsWith('migrations/index.js')
);

if (isMainModule) {
  runMigrations()
    .then(() => {
      console.log('Migrations complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
