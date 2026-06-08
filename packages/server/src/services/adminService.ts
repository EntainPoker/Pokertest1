import { query, transaction } from '../config/database.js';
import type { GameInstance } from '@spin-and-go/shared';

export function validateGameCreationParams(name: string, maxPlayers: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Game name is required and must be a non-empty string');
  }
  if (maxPlayers === undefined || maxPlayers === null || typeof maxPlayers !== 'number') {
    errors.push('Player count is required and must be a number');
  } else if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 10) {
    errors.push('Player count must be an integer between 2 and 10');
  }
  return { valid: errors.length === 0, errors };
}

export function createGameInstance(
  name: string,
  maxPlayers: number,
  createdBy: string,
  blindIntervalMinutes: number = 3,
  startingChips: number = 500,
  tableTheme: string = 'classic-green',
  gameType: string = 'spin-and-go',
): GameInstance {
  const validation = validateGameCreationParams(name, maxPlayers);
  if (!validation.valid) throw new Error(validation.errors.join('; '));

  const id = crypto.randomUUID().replace(/-/g, '');

  query(
    `INSERT INTO game_instances (id, name, format, max_players, buy_in, starting_chips, blind_interval_minutes, table_theme, game_type, status, created_at, end_date, created_by)
     VALUES (?, ?, 'texas_holdem', ?, 1, ?, ?, ?, ?, 'open', datetime('now'), datetime('now', '+30 days'), ?)`,
    [id, name.trim(), maxPlayers, startingChips, blindIntervalMinutes, tableTheme, gameType, createdBy]
  );

  const result = query('SELECT * FROM game_instances WHERE id = ?', [id]);
  const row = result.rows[0];

  return {
    id: row.id,
    name: row.name,
    format: 'texas_holdem',
    maxPlayers: row.max_players,
    buyIn: row.buy_in,
    startingChips: row.starting_chips,
    blindIntervalMinutes: row.blind_interval_minutes,
    registeredPlayers: [],
    status: row.status,
    createdAt: new Date(row.created_at),
    endDate: new Date(row.end_date),
    createdBy: row.created_by,
    tableTheme: row.table_theme || 'classic-green',
  };
}

export function listGameInstances(statusFilter?: string): GameInstance[] {
  let sql = `SELECT gi.*, COALESCE(GROUP_CONCAT(gr.player_id), '') as registered_players
    FROM game_instances gi LEFT JOIN game_registrations gr ON gi.id = gr.game_instance_id`;
  const params: unknown[] = [];

  if (statusFilter) {
    sql += ' WHERE gi.status = ?';
    params.push(statusFilter);
  }
  sql += ' GROUP BY gi.id ORDER BY gi.created_at DESC';

  const result = query(sql, params);
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    format: 'texas_holdem' as const,
    maxPlayers: row.max_players,
    buyIn: row.buy_in,
    startingChips: row.starting_chips,
    blindIntervalMinutes: row.blind_interval_minutes,
    registeredPlayers: row.registered_players ? row.registered_players.split(',').filter(Boolean) : [],
    status: row.status,
    createdAt: new Date(row.created_at),
    endDate: new Date(row.end_date),
    createdBy: row.created_by,
    gameType: row.game_type || 'spin-and-go',
  }));
}

export function removeGameInstance(gameId: string): void {
  transaction((client) => {
    const gameResult = client.query('SELECT * FROM game_instances WHERE id = ?', [gameId]);
    if (gameResult.rows.length === 0) throw new Error('Game instance not found');

    const regs = client.query('SELECT player_id FROM game_registrations WHERE game_instance_id = ?', [gameId]);
    for (const reg of regs.rows) {
      client.query('UPDATE players SET balance = balance + 1 WHERE id = ?', [reg.player_id]);
    }
    client.query('DELETE FROM game_registrations WHERE game_instance_id = ?', [gameId]);
    client.query('DELETE FROM game_instances WHERE id = ?', [gameId]);
  });
}

export function cleanupExpiredGames(): number {
  const expired = query(`SELECT id, buy_in FROM game_instances WHERE end_date < datetime('now') AND status != 'in_progress'`, []);
  let count = 0;

  for (const game of expired.rows) {
    transaction((client) => {
      const regs = client.query('SELECT player_id FROM game_registrations WHERE game_instance_id = ?', [game.id]);
      for (const reg of regs.rows) {
        client.query('UPDATE players SET balance = balance + ? WHERE id = ?', [game.buy_in, reg.player_id]);
      }
      client.query('DELETE FROM game_registrations WHERE game_instance_id = ?', [game.id]);
      client.query('DELETE FROM game_instances WHERE id = ?', [game.id]);
    });
    count++;
  }
  return count;
}

export function startCleanupJob(): void {
  cleanupExpiredGames();
  setInterval(() => cleanupExpiredGames(), 60_000);
}

export function stopCleanupJob(): void {}
