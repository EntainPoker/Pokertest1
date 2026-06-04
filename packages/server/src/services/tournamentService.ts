import { query, transaction } from '../config/database.js';
import { io } from '../index.js';
import { emitLobbyUpdate } from './lobbyService.js';
import type { GameState, Tournament, TournamentPlayer, HandState } from '@spin-and-go/shared';
import { BLIND_SCHEDULE } from '@spin-and-go/shared';

/**
 * In-memory map tracking which players are connected to which game instances.
 * Key: playerId, Value: { socketId, gameInstanceId }
 */
export const playerConnections = new Map<string, { socketId: string; gameInstanceId: string }>();

/**
 * Check if a game instance has reached max players and should start a tournament.
 * Called after a successful registration.
 *
 * If the game is full (max_players reached):
 * 1. Update game_instances status to 'in_progress'
 * 2. Insert into tournaments table
 * 3. Insert into tournament_players for each registered player
 * 4. Spawn a new game instance of the same type
 * 5. Emit 'game:start' WebSocket event to all registered players within 5 seconds
 * 6. Emit 'lobby:update' for both the started game and the new game
 */
export function checkAndStartTournament(gameInstanceId: string): void {
  // Check if game is now full
  const gameResult = query(
    `SELECT gi.*, COUNT(gr.player_id) AS player_count
     FROM game_instances gi
     LEFT JOIN game_registrations gr ON gi.id = gr.game_instance_id
     WHERE gi.id = ?
     GROUP BY gi.id`,
    [gameInstanceId]
  );

  if (gameResult.rows.length === 0) return;

  const game = gameResult.rows[0];
  const maxPlayers = game.max_players as number;

  // Only start if the game has reached max players
  if ((game.player_count as number) < maxPlayers) return;

  // Get registered players
  const playersResult = query(
    `SELECT gr.player_id, p.username
     FROM game_registrations gr
     JOIN players p ON gr.player_id = p.id
     WHERE gr.game_instance_id = ?
     ORDER BY gr.registered_at ASC`,
    [gameInstanceId]
  );

  const registeredPlayers = playersResult.rows;

  // Use a transaction to create the tournament and spawn a new game instance
  const { tournamentId, newGameId } = transaction((client) => {
    // 1. Update game_instances status to 'in_progress'
    client.query(
      "UPDATE game_instances SET status = 'in_progress' WHERE id = ?",
      [gameInstanceId]
    );

    // 2. Insert into tournaments table
    const prizePool = (game.buy_in as number) * maxPlayers;
    const tId = crypto.randomUUID().replace(/-/g, '');
    client.query(
      `INSERT INTO tournaments (id, game_instance_id, current_blind_level, prize_pool, status, started_at)
       VALUES (?, ?, 1, ?, 'active', datetime('now'))`,
      [tId, gameInstanceId, prizePool]
    );

    // 3. Insert into tournament_players for each registered player
    for (const player of registeredPlayers) {
      client.query(
        `INSERT INTO tournament_players (id, tournament_id, player_id, chip_count, status)
         VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'active')`,
        [tId, player.player_id, game.starting_chips]
      );
    }

    // 4. Spawn a new game instance of the same type with 0 players and 'open' status
    const newId = crypto.randomUUID().replace(/-/g, '');
    client.query(
      `INSERT INTO game_instances (id, name, format, max_players, buy_in, starting_chips, blind_interval_minutes, status, created_at, end_date)
       VALUES (?, ?, 'texas_holdem', ?, ?, ?, ?, 'open', datetime('now'), datetime('now', '+30 days'))`,
      [newId, game.name, maxPlayers, game.buy_in, game.starting_chips, game.blind_interval_minutes]
    );

    return { tournamentId: tId, newGameId: newId };
  });

  // 5. Build game state and emit 'game:start'
  const tournamentPlayers: TournamentPlayer[] = registeredPlayers.map((p: any) => ({
    playerId: p.player_id as string,
    username: p.username as string,
    chipCount: game.starting_chips as number,
    status: 'active' as const,
    finishPosition: null,
    eliminatedAt: null,
  }));

  const tournament: Tournament = {
    id: tournamentId,
    gameInstanceId,
    players: tournamentPlayers,
    currentBlindLevel: 1,
    blindSchedule: BLIND_SCHEDULE,
    startedAt: new Date(),
    completedAt: null,
    prizePool: (game.buy_in as number) * maxPlayers,
    winnerId: null,
    status: 'active',
  };

  const initialHandState: HandState = {
    id: '',
    tournamentId,
    handNumber: 0,
    dealerPosition: 0,
    smallBlindPosition: 1,
    bigBlindPosition: Math.min(2, registeredPlayers.length - 1),
    communityCards: [],
    pot: 0,
    sidePots: [],
    players: tournamentPlayers.map((p) => ({
      playerId: p.playerId,
      username: p.username,
      holeCards: [],
      chipCount: p.chipCount,
      currentBet: 0,
      totalBetThisHand: 0,
      status: 'active' as const,
      hasActed: false,
    })),
    currentPlayerIndex: 0,
    bettingRound: 'preflop',
    currentBet: 0,
    minRaise: BLIND_SCHEDULE[0].bigBlind,
    lastAction: null,
    turnStartedAt: new Date(),
    turnTimeoutSeconds: 30,
  };

  const gameState: GameState = {
    handState: initialHandState,
    tournament,
  };

  // Emit game:start to all registered players within 5 seconds
  setTimeout(() => {
    for (const player of registeredPlayers) {
      const connection = playerConnections.get(player.player_id as string);
      if (connection) {
        io.to(connection.socketId).emit('game:start', gameState);
      }
    }

    // Also emit to the game room in case players joined via room
    io.to(`game:${gameInstanceId}`).emit('game:start', gameState);
  }, 1000);

  // 6. Emit 'lobby:update' for both the started game and the new game
  emitLobbyUpdate(gameInstanceId, maxPlayers, 'in_progress');
  emitLobbyUpdate(newGameId, 0, 'open');
}

/**
 * Handle player disconnect from a game instance.
 * If the game has not started yet (status is 'open'), unregister the player,
 * refund their buy-in, and free the seat.
 */
export function handlePlayerDisconnect(playerId: string, gameInstanceId: string): void {
  const gameResult = query(
    `SELECT id, status, buy_in FROM game_instances WHERE id = ?`,
    [gameInstanceId]
  );

  if (gameResult.rows.length === 0) return;

  const game = gameResult.rows[0];

  // Only handle disconnect for games that haven't started yet
  if (game.status !== 'open' && game.status !== 'full') return;

  transaction((client) => {
    const regResult = client.query(
      'SELECT id FROM game_registrations WHERE game_instance_id = ? AND player_id = ?',
      [gameInstanceId, playerId]
    );

    if (regResult.rows.length === 0) return;

    client.query(
      'DELETE FROM game_registrations WHERE game_instance_id = ? AND player_id = ?',
      [gameInstanceId, playerId]
    );

    client.query(
      'UPDATE players SET balance = balance + ? WHERE id = ?',
      [game.buy_in, playerId]
    );

    if (game.status === 'full') {
      client.query(
        "UPDATE game_instances SET status = 'open' WHERE id = ?",
        [gameInstanceId]
      );
    }
  });

  const countResult = query(
    'SELECT COUNT(*) AS count FROM game_registrations WHERE game_instance_id = ?',
    [gameInstanceId]
  );
  const newCount = countResult.rows[0].count as number;

  emitLobbyUpdate(gameInstanceId, newCount, 'open');
  playerConnections.delete(playerId);
}
