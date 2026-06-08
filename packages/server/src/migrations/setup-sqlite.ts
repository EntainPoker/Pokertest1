import { getDb } from '../config/database.js';

/**
 * Creates all tables for the Spin and Go poker application using SQLite.
 */
export function runSQLiteMigrations(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 1000,
      is_test_account INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_players_username ON players (username);

    CREATE TABLE IF NOT EXISTS game_instances (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'texas_holdem',
      max_players INTEGER NOT NULL DEFAULT 3,
      buy_in INTEGER NOT NULL DEFAULT 1,
      starting_chips INTEGER NOT NULL DEFAULT 500,
      blind_interval_minutes INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      end_date TEXT NOT NULL,
      created_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_game_instances_status ON game_instances (status);

    CREATE TABLE IF NOT EXISTS game_registrations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      game_instance_id TEXT NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(game_instance_id, player_id)
    );

    CREATE INDEX IF NOT EXISTS idx_game_registrations_game ON game_registrations (game_instance_id);
    CREATE INDEX IF NOT EXISTS idx_game_registrations_player ON game_registrations (player_id);

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      game_instance_id TEXT NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
      current_blind_level INTEGER NOT NULL DEFAULT 1,
      prize_pool INTEGER NOT NULL DEFAULT 0,
      winner_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments (game_instance_id);

    CREATE TABLE IF NOT EXISTS tournament_players (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      chip_count INTEGER NOT NULL DEFAULT 500,
      status TEXT NOT NULL DEFAULT 'active',
      finish_position INTEGER,
      eliminated_at TEXT,
      UNIQUE(tournament_id, player_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament ON tournament_players (tournament_id);

    CREATE TABLE IF NOT EXISTS hand_histories (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      hand_number INTEGER NOT NULL,
      community_cards TEXT NOT NULL DEFAULT '[]',
      actions TEXT NOT NULL DEFAULT '[]',
      players TEXT NOT NULL DEFAULT '[]',
      result TEXT NOT NULL DEFAULT '{}',
      pot_total INTEGER NOT NULL DEFAULT 0,
      played_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_hand_histories_tournament ON hand_histories (tournament_id);

    CREATE TABLE IF NOT EXISTS admin_accounts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts (username);
  `);

  // Add table_theme column if it doesn't exist (migration-safe)
  try {
    db.exec("ALTER TABLE game_instances ADD COLUMN table_theme TEXT DEFAULT 'classic-green'");
  } catch { /* column already exists */ }

  // Add game_type column to distinguish spin-and-go, heads-up, tourney
  try {
    db.exec("ALTER TABLE game_instances ADD COLUMN game_type TEXT DEFAULT 'spin-and-go'");
  } catch { /* column already exists */ }

  // Fix existing games that have NULL game_type — set based on max_players
  try {
    db.exec("UPDATE game_instances SET game_type = 'heads-up' WHERE game_type IS NULL AND max_players = 2");
    db.exec("UPDATE game_instances SET game_type = 'spin-and-go' WHERE game_type IS NULL AND max_players = 3");
    db.exec("UPDATE game_instances SET game_type = 'spin-and-go' WHERE game_type IS NULL");
  } catch { /* ignore if fails */ }

  console.log('SQLite database tables created successfully.');
}
