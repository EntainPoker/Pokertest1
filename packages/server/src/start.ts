/**
 * Production start script — seeds the database then starts the server.
 */
import bcrypt from 'bcrypt';
import { query } from './config/database.js';
import { runSQLiteMigrations } from './migrations/setup-sqlite.js';

// Step 1: Ensure tables exist
runSQLiteMigrations();

// Step 2: Seed test accounts
const TEST_ACCOUNTS = [
  { username: 'testplayer1', password: 'password123' },
  { username: 'testplayer2', password: 'password123' },
  { username: 'testplayer3', password: 'password123' },
];

for (const account of TEST_ACCOUNTS) {
  const hash = await bcrypt.hash(account.password, 10);
  query(
    `INSERT OR IGNORE INTO players (id, username, password_hash, balance, is_test_account, created_at)
     VALUES (lower(hex(randomblob(16))), ?, ?, 1000, 1, datetime('now'))`,
    [account.username, hash]
  );
}

// Step 3: Seed default games if none exist
const existing = query(`SELECT id FROM game_instances WHERE status = 'open' LIMIT 1`, []);
if (existing.rows.length === 0) {
  query(
    `INSERT INTO game_instances (id, name, format, max_players, buy_in, starting_chips, blind_interval_minutes, status, created_at, end_date)
     VALUES (lower(hex(randomblob(16))), 'Spin & Go #1', 'texas_holdem', 3, 1, 500, 3, 'open', datetime('now'), datetime('now', '+30 days'))`,
    []
  );
  query(
    `INSERT INTO game_instances (id, name, format, max_players, buy_in, starting_chips, blind_interval_minutes, status, created_at, end_date)
     VALUES (lower(hex(randomblob(16))), 'Heads-Up Showdown', 'texas_holdem', 2, 1, 500, 3, 'open', datetime('now'), datetime('now', '+30 days'))`,
    []
  );
}

console.log('Database seeded. Starting server...');

// Step 4: Start the server
await import('./index.js');
