import { query, transaction } from '../config/database.js';
import { io } from '../index.js';
import type { GameInstance, RegistrationResult, LobbyUpdatePayload } from '@spin-and-go/shared';

function mapRowToGame(row: Record<string, unknown>): Omit<GameInstance, 'createdBy'> {
  const registeredPlayers = row.registered_players
    ? (row.registered_players as string).split(',').filter(Boolean)
    : [];

  return {
    id: row.id as string,
    name: row.name as string,
    format: row.format as 'texas_holdem',
    maxPlayers: row.max_players as number,
    buyIn: row.buy_in as number,
    startingChips: row.starting_chips as number,
    blindIntervalMinutes: row.blind_interval_minutes as number,
    registeredPlayers,
    status: row.status as GameInstance['status'],
    createdAt: new Date(row.created_at as string),
    endDate: new Date(row.end_date as string),
    gameType: (row.game_type as string) || ((row.max_players as number) === 2 ? 'heads-up' : 'spin-and-go'),
  };
}

export function getAvailableGames(): Omit<GameInstance, 'createdBy'>[] {
  const result = query(
    `SELECT gi.*,
      COALESCE(GROUP_CONCAT(gr.player_id), '') AS registered_players
     FROM game_instances gi
     LEFT JOIN game_registrations gr ON gi.id = gr.game_instance_id
     WHERE gi.status = 'open' AND gi.end_date > datetime('now')
     GROUP BY gi.id
     ORDER BY gi.created_at DESC`,
    []
  );
  return result.rows.map(mapRowToGame);
}

export function registerPlayer(playerId: string, gameInstanceId: string): RegistrationResult {
  return transaction((client) => {
    const gameResult = client.query('SELECT * FROM game_instances WHERE id = ?', [gameInstanceId]);
    if (gameResult.rows.length === 0) return { success: false, message: 'Game not found', playerCount: 0 };

    const game = gameResult.rows[0];
    if (game.status !== 'open') return { success: false, message: 'Game is not open for registration', playerCount: 0 };

    const countResult = client.query('SELECT COUNT(*) as count FROM game_registrations WHERE game_instance_id = ?', [gameInstanceId]);
    const currentCount = countResult.rows[0].count as number;

    if (currentCount >= (game.max_players as number)) return { success: false, message: 'Game is full', playerCount: currentCount };

    const existingReg = client.query('SELECT id FROM game_registrations WHERE game_instance_id = ? AND player_id = ?', [gameInstanceId, playerId]);
    if (existingReg.rows.length > 0) return { success: false, message: 'Player is already registered for this game', playerCount: currentCount };

    const playerResult = client.query('SELECT balance FROM players WHERE id = ?', [playerId]);
    if (playerResult.rows.length === 0) return { success: false, message: 'Player not found', playerCount: currentCount };

    const playerBalance = playerResult.rows[0].balance as number;
    if (playerBalance < (game.buy_in as number)) return { success: false, message: 'Insufficient balance', playerCount: currentCount };

    client.query('UPDATE players SET balance = balance - ? WHERE id = ?', [game.buy_in, playerId]);
    client.query(`INSERT INTO game_registrations (id, game_instance_id, player_id, registered_at) VALUES (lower(hex(randomblob(16))), ?, ?, datetime('now'))`, [gameInstanceId, playerId]);

    const newCount = currentCount + 1;
    if (newCount >= (game.max_players as number)) {
      client.query(`UPDATE game_instances SET status = 'full' WHERE id = ?`, [gameInstanceId]);
    }

    return { success: true, message: 'Registration successful', playerCount: newCount };
  });
}

export function unregisterPlayer(playerId: string, gameInstanceId: string): RegistrationResult {
  return transaction((client) => {
    const gameResult = client.query('SELECT * FROM game_instances WHERE id = ?', [gameInstanceId]);
    if (gameResult.rows.length === 0) return { success: false, message: 'Game not found', playerCount: 0 };

    const game = gameResult.rows[0];
    const regResult = client.query('SELECT id FROM game_registrations WHERE game_instance_id = ? AND player_id = ?', [gameInstanceId, playerId]);
    if (regResult.rows.length === 0) return { success: false, message: 'Player is not registered for this game', playerCount: 0 };

    client.query('DELETE FROM game_registrations WHERE game_instance_id = ? AND player_id = ?', [gameInstanceId, playerId]);
    client.query('UPDATE players SET balance = balance + ? WHERE id = ?', [game.buy_in, playerId]);

    const countResult = client.query('SELECT COUNT(*) as count FROM game_registrations WHERE game_instance_id = ?', [gameInstanceId]);
    const newCount = countResult.rows[0].count as number;

    if (game.status === 'full') {
      client.query(`UPDATE game_instances SET status = 'open' WHERE id = ?`, [gameInstanceId]);
    }

    return { success: true, message: 'Unregistration successful', playerCount: newCount };
  });
}

export function emitLobbyUpdate(gameId: string, playerCount: number, status: GameInstance['status']): void {
  const payload: LobbyUpdatePayload = { gameId, playerCount, status };
  io.emit('lobby:update', payload);
}
