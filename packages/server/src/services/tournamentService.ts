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
export async function checkAndStartTournament(gameInstanceId: string): Promise<void> {
  // Check if game is now full
  const gameResult = await query(
    `SELECT gi.id, gi.name, gi.max_players, gi.buy_in, gi.starting_chips,
            gi.blind_interval_minutes, gi.status, gi.end_date, gi.created_by,
            COUNT(gr.player_id)::int AS player_count
     FROM game_instances gi
     LEFT JOIN game_registrations gr ON gi.id = gr.game_instance_id
     WHERE gi.id = $1
     GROUP BY gi.id`,
    [gameInstanceId]
  );

  if (gameResult.rows.length === 0) return;

  const game = gameResult.rows[0];

  // Only start if the game has reached max players
  if (game.player_count < game.max_players) return;

  // Get registered players
  const playersResult = await query(
    `SELECT gr.player_id, p.username
     FROM game_registrations gr
     JOIN players p ON gr.player_id = p.id
     WHERE gr.game_instance_id = $1
     ORDER BY gr.registered_at ASC`,
    [gameInstanceId]
  );

  const registeredPlayers = playersResult.rows;

  // Use a transaction to create the tournament and spawn a new game instance
  const { tournamentId, newGameId } = await transaction(async (client) => {
    // 1. Update game_instances status to 'in_progress'
    await client.query(
      "UPDATE game_instances SET status = 'in_progress' WHERE id = $1",
      [gameInstanceId]
    );

    // 2. Insert into tournaments table
    const prizePool = game.buy_in * game.max_players;
    const tournamentInsert = await client.query(
      `INSERT INTO tournaments (game_instance_id, current_blind_level, prize_pool, status, started_at)
       VALUES ($1, 1, $2, 'active', NOW())
       RETURNING id`,
      [gameInstanceId, prizePool]
    );
    const tournamentId = tournamentInsert.rows[0].id;

    // 3. Insert into tournament_players for each registered player
    for (const player of registeredPlayers) {
      await client.query(
        `INSERT INTO tournament_players (tournament_id, player_id, chip_count, status)
         VALUES ($1, $2, $3, 'active')`,
        [tournamentId, player.player_id, game.starting_chips]
      );
    }

    // 4. Spawn a new game instance of the same type with 0 players and 'open' status
    const newGameInsert = await client.query(
      `INSERT INTO game_instances (name, format, max_players, buy_in, starting_chips, blind_interval_minutes, status, created_at, end_date, created_by)
       VALUES ($1, 'texas_holdem', $2, $3, $4, $5, 'open', NOW(), NOW() + INTERVAL '30 days', $6)
       RETURNING id`,
      [game.name, game.max_players, game.buy_in, game.starting_chips, game.blind_interval_minutes, game.created_by]
    );
    const newGameId = newGameInsert.rows[0].id;

    return { tournamentId, newGameId };
  });

  // 5. Emit 'game:start' WebSocket event to all registered players within 5 seconds
  const tournamentPlayers: TournamentPlayer[] = registeredPlayers.map((p) => ({
    playerId: p.player_id,
    username: p.username,
    chipCount: game.starting_chips,
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
    prizePool: game.buy_in * game.max_players,
    winnerId: null,
    status: 'active',
  };

  // Create initial hand state placeholder (will be populated by game engine)
  const initialHandState: HandState = {
    id: '',
    tournamentId,
    handNumber: 0,
    dealerPosition: 0,
    smallBlindPosition: 1,
    bigBlindPosition: 2,
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
      const connection = playerConnections.get(player.player_id);
      if (connection) {
        io.to(connection.socketId).emit('game:start', gameState);
      }
    }

    // Also emit to the game room in case players joined via room
    io.to(`game:${gameInstanceId}`).emit('game:start', gameState);
  }, 1000); // Emit after 1 second (well within the 5-second requirement)

  // 6. Emit 'lobby:update' for both the started game and the new game
  emitLobbyUpdate(gameInstanceId, game.max_players, 'in_progress');
  emitLobbyUpdate(newGameId, 0, 'open');
}

/**
 * Handle player disconnect from a game instance.
 * If the game has not started yet (status is 'open'), unregister the player,
 * refund their buy-in, and free the seat.
 */
export async function handlePlayerDisconnect(playerId: string, gameInstanceId: string): Promise<void> {
  // Check game status
  const gameResult = await query(
    `SELECT id, status, buy_in FROM game_instances WHERE id = $1`,
    [gameInstanceId]
  );

  if (gameResult.rows.length === 0) return;

  const game = gameResult.rows[0];

  // Only handle disconnect for games that haven't started yet
  if (game.status !== 'open' && game.status !== 'full') return;

  await transaction(async (client) => {
    // Check if player is registered
    const regResult = await client.query(
      'SELECT id FROM game_registrations WHERE game_instance_id = $1 AND player_id = $2',
      [gameInstanceId, playerId]
    );

    if (regResult.rows.length === 0) return;

    // Unregister player
    await client.query(
      'DELETE FROM game_registrations WHERE game_instance_id = $1 AND player_id = $2',
      [gameInstanceId, playerId]
    );

    // Refund buy-in
    await client.query(
      'UPDATE players SET balance = balance + $1 WHERE id = $2',
      [game.buy_in, playerId]
    );

    // Update game status back to 'open' if it was 'full'
    if (game.status === 'full') {
      await client.query(
        "UPDATE game_instances SET status = 'open' WHERE id = $1",
        [gameInstanceId]
      );
    }
  });

  // Get updated player count
  const countResult = await query(
    'SELECT COUNT(*)::int AS count FROM game_registrations WHERE game_instance_id = $1',
    [gameInstanceId]
  );
  const newCount = countResult.rows[0].count;

  // Emit lobby update
  emitLobbyUpdate(gameInstanceId, newCount, 'open');

  // Remove player connection tracking
  playerConnections.delete(playerId);
}
