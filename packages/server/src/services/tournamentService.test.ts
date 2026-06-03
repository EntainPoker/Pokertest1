import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database module
const mockQuery = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../config/database.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (cb: unknown) => mockTransaction(cb),
}));

// Mock the io export from index
const mockEmit = vi.fn();
const mockTo = vi.fn(() => ({ emit: mockEmit }));

vi.mock('../index.js', () => ({
  io: {
    emit: vi.fn(),
    to: (...args: unknown[]) => mockTo(...args),
  },
}));

// Mock lobbyService
const mockEmitLobbyUpdate = vi.fn();
vi.mock('./lobbyService.js', () => ({
  emitLobbyUpdate: (...args: unknown[]) => mockEmitLobbyUpdate(...args),
}));

import { checkAndStartTournament, handlePlayerDisconnect, playerConnections } from './tournamentService.js';

describe('Tournament Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    playerConnections.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkAndStartTournament', () => {
    it('should not start tournament if game has fewer than max players', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'game-1',
          name: 'Test Game',
          max_players: 3,
          buy_in: 1,
          starting_chips: 500,
          blind_interval_minutes: 3,
          status: 'full',
          end_date: new Date('2099-01-01'),
          created_by: 'admin-1',
          player_count: 2,
        }],
      });

      await checkAndStartTournament('game-1');

      // Transaction should not be called
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should not start tournament if game is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await checkAndStartTournament('nonexistent');

      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should create tournament when game reaches max players', async () => {
      // First query: get game with player count
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'game-1',
          name: 'Test Game',
          max_players: 3,
          buy_in: 1,
          starting_chips: 500,
          blind_interval_minutes: 3,
          status: 'full',
          end_date: new Date('2099-01-01'),
          created_by: 'admin-1',
          player_count: 3,
        }],
      });

      // Second query: get registered players
      mockQuery.mockResolvedValueOnce({
        rows: [
          { player_id: 'player-1', username: 'alice' },
          { player_id: 'player-2', username: 'bob' },
          { player_id: 'player-3', username: 'charlie' },
        ],
      });

      // Mock transaction
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => {
        return cb(mockClient);
      });

      // Transaction queries:
      // 1. Update game status to in_progress
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // 2. Insert tournament
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'tournament-1' }] });
      // 3-5. Insert tournament_players (3 players)
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // 6. Spawn new game instance
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'new-game-1' }] });

      await checkAndStartTournament('game-1');

      // Verify game status updated to in_progress
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'in_progress'"),
        ['game-1']
      );

      // Verify tournament was created with correct prize pool
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tournaments'),
        ['game-1', 3, 'active', expect.anything()]
      );

      // Verify tournament_players were created with 500 starting chips
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tournament_players'),
        ['tournament-1', 'player-1', 500, 'active']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tournament_players'),
        ['tournament-1', 'player-2', 500, 'active']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tournament_players'),
        ['tournament-1', 'player-3', 500, 'active']
      );

      // Verify new game instance was spawned
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO game_instances'),
        ['Test Game', 3, 1, 500, 3, 'admin-1']
      );

      // Verify lobby updates were emitted
      expect(mockEmitLobbyUpdate).toHaveBeenCalledWith('game-1', 3, 'in_progress');
      expect(mockEmitLobbyUpdate).toHaveBeenCalledWith('new-game-1', 0, 'open');
    });

    it('should emit game:start to connected players within 5 seconds', async () => {
      // Setup player connections
      playerConnections.set('player-1', { socketId: 'socket-1', gameInstanceId: 'game-1' });
      playerConnections.set('player-2', { socketId: 'socket-2', gameInstanceId: 'game-1' });
      playerConnections.set('player-3', { socketId: 'socket-3', gameInstanceId: 'game-1' });

      // First query: get game with player count
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'game-1',
          name: 'Test Game',
          max_players: 3,
          buy_in: 1,
          starting_chips: 500,
          blind_interval_minutes: 3,
          status: 'full',
          end_date: new Date('2099-01-01'),
          created_by: 'admin-1',
          player_count: 3,
        }],
      });

      // Second query: get registered players
      mockQuery.mockResolvedValueOnce({
        rows: [
          { player_id: 'player-1', username: 'alice' },
          { player_id: 'player-2', username: 'bob' },
          { player_id: 'player-3', username: 'charlie' },
        ],
      });

      // Mock transaction
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => {
        return cb(mockClient);
      });

      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'tournament-1' }] });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'new-game-1' }] });

      await checkAndStartTournament('game-1');

      // Before timeout, no game:start should be emitted
      expect(mockTo).not.toHaveBeenCalled();

      // Advance timer by 1 second (the setTimeout delay)
      vi.advanceTimersByTime(1000);

      // Now game:start should have been emitted to each player's socket
      expect(mockTo).toHaveBeenCalledWith('socket-1');
      expect(mockTo).toHaveBeenCalledWith('socket-2');
      expect(mockTo).toHaveBeenCalledWith('socket-3');
      // Also emitted to the game room
      expect(mockTo).toHaveBeenCalledWith('game:game-1');
      expect(mockEmit).toHaveBeenCalledWith('game:start', expect.objectContaining({
        tournament: expect.objectContaining({
          id: 'tournament-1',
          gameInstanceId: 'game-1',
          status: 'active',
          prizePool: 3,
        }),
      }));
    });
  });

  describe('handlePlayerDisconnect', () => {
    it('should unregister player and refund buy-in if game has not started', async () => {
      // First query: get game status
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'game-1', status: 'open', buy_in: 1 }],
      });

      // Mock transaction
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => {
        return cb(mockClient);
      });

      // Check registration exists
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'reg-1' }] });
      // Delete registration
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Refund buy-in
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      // Get updated count
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] });

      // Track the player connection
      playerConnections.set('player-1', { socketId: 'socket-1', gameInstanceId: 'game-1' });

      await handlePlayerDisconnect('player-1', 'game-1');

      // Verify unregistration
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM game_registrations'),
        ['game-1', 'player-1']
      );

      // Verify refund
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE players SET balance = balance +'),
        [1, 'player-1']
      );

      // Verify lobby update emitted
      expect(mockEmitLobbyUpdate).toHaveBeenCalledWith('game-1', 1, 'open');

      // Verify player connection removed
      expect(playerConnections.has('player-1')).toBe(false);
    });

    it('should not unregister player if game is in_progress', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'game-1', status: 'in_progress', buy_in: 1 }],
      });

      await handlePlayerDisconnect('player-1', 'game-1');

      // Transaction should not be called
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should not unregister player if game is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlePlayerDisconnect('player-1', 'nonexistent');

      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should handle disconnect for full game (set status back to open)', async () => {
      // First query: get game status
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'game-1', status: 'full', buy_in: 1 }],
      });

      // Mock transaction
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => {
        return cb(mockClient);
      });

      // Check registration exists
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'reg-1' }] });
      // Delete registration
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Refund buy-in
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Update status to open
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      // Get updated count
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 2 }] });

      await handlePlayerDisconnect('player-1', 'game-1');

      // Verify status was set back to open
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'open'"),
        ['game-1']
      );
    });

    it('should do nothing if player is not registered', async () => {
      // First query: get game status
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'game-1', status: 'open', buy_in: 1 }],
      });

      // Mock transaction
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => {
        return cb(mockClient);
      });

      // Player not registered
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await handlePlayerDisconnect('player-1', 'game-1');

      // Only the registration check query should have been called
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });
});
