import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { runSQLiteMigrations } from '../migrations/setup-sqlite.js';

const TEST_ACCOUNTS = [
  { username: 'testplayer1', password: 'password123' },
  { username: 'testplayer2', password: 'password123' },
  { username: 'testplayer3', password: 'password123' },
];

const STARTING_BALANCE = 1000;
const SALT_ROUNDS = 10;

async function seedTestAccounts(): Promise<void> {
  // Ensure tables exist
  runSQLiteMigrations();

  console.log('Seeding test accounts...');

  for (const account of TEST_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, SALT_ROUNDS);

    query(
      `INSERT OR IGNORE INTO players (id, username, password_hash, balance, is_test_account, created_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, 1, datetime('now'))`,
      [account.username, passwordHash, STARTING_BALANCE]
    );

    console.log(`  Seeded account: ${account.username}`);
  }

  // Also create a default game instance so the lobby has something to show
  const existing = query(`SELECT id FROM game_instances WHERE status = 'open' LIMIT 1`, []);
  if (existing.rows.length === 0) {
    query(
      `INSERT INTO game_instances (id, name, format, max_players, buy_in, starting_chips, blind_interval_minutes, status, created_at, end_date)
       VALUES (lower(hex(randomblob(16))), 'Spin & Go #1', 'texas_holdem', 3, 1, 500, 3, 'open', datetime('now'), datetime('now', '+30 days'))`,
      []
    );
    console.log('  Created default game instance: Spin & Go #1');
  }

  // Seed admin account
  const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
  query(
    `INSERT OR IGNORE INTO admin_accounts (id, username, password_hash, created_at)
     VALUES (lower(hex(randomblob(16))), 'admin', ?, datetime('now'))`,
    [adminHash]
  );
  console.log('  Seeded admin account: admin / admin123');

  console.log('Seeding complete.');
}

seedTestAccounts().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
