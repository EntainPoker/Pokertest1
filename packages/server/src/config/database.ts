import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file stored in a persistent location.
// On Render: set DATABASE_PATH env var to a persistent disk path (e.g., /opt/render/data/spin-and-go.db)
// Without persistent disk, SQLite data is LOST on every deploy (ephemeral filesystem).
// For production: switch to PostgreSQL for data that persists across deploys.
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'spin-and-go.db');

// Ensure the data directory exists
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Execute a query and return all rows.
 */
export function query(text: string, params?: unknown[]): { rows: any[]; rowCount: number } {
  try {
    const stmt = db.prepare(text);
    if (text.trim().toUpperCase().startsWith('SELECT') || text.trim().toUpperCase().startsWith('WITH')) {
      const rows = params ? stmt.all(...params) : stmt.all();
      return { rows, rowCount: rows.length };
    } else if (text.includes('RETURNING')) {
      const rows = params ? stmt.all(...params) : stmt.all();
      return { rows, rowCount: rows.length };
    } else {
      const result = params ? stmt.run(...params) : stmt.run();
      return { rows: [], rowCount: result.changes };
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Execute a transaction with a callback.
 */
export function transaction<T>(callback: (client: TransactionClient) => T): T {
  const txn = db.transaction(() => {
    const client: TransactionClient = {
      query: (text: string, params?: unknown[]) => query(text, params),
    };
    return callback(client);
  });
  return txn();
}

export interface TransactionClient {
  query: (text: string, params?: unknown[]) => { rows: any[]; rowCount: number };
}

/**
 * Get the raw database instance (for migrations).
 */
export function getDb(): Database.Database {
  return db;
}

export const pool = {
  end: () => db.close(),
  query: (text: string, params?: unknown[]) => query(text, params),
  connect: () => ({ query: (text: string, params?: unknown[]) => query(text, params), release: () => {} }),
};

export default db;
