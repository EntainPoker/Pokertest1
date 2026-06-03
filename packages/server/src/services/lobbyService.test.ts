import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
const mockQuery = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../config/database.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (cb: unknown) => mockTransaction(cb),
}));

// Mock the io export from index
vi.mock('../index.js', () => ({
  io: {
    emit: vi.fn(),
  },
}));

import * as lobbyService from './lobbyService.js';
import { io } from '../index.js';

describe('Lobby Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAvailableGames', () => {
    it('should return games with status open and end_date > NOW()', async () => {
      const mockGames = [
        {
          id: 'game-1',
          name: 'Test Game 1',
          format: 'texas_holdem',
          max_players: 3,
          buy_in: 1,
          starting_chips: 500,
          blind_interval_minutes: 3,
          status: 'open',
          created_at: new Date('2024-01-01'),
          end_date: new Date('2024-02-01'),
          registered_players: ['player-1'],
        },
        {
          id: 'game-2',
          name: 'Test Game 2',
          format: 'texas_holdem',
          max_players: 3,
          buy_in: 1,
          starting_chips: 500,
          blind_interval_minutes: 3,
          status: 'open',
          created_at: new Date('2024-01-02'),
          end_date: new Date('2024-02-02'),
          registered_players: [],
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockGames });

      const result = await lobbyService.getAvailableGames();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('game-1');
      expect(result[0].name).toBe('Test Game 1');
      expect(result[0].registeredPlayers).toEqual(['player-1']);
      expect(result[1].registeredPlayers).toEqual([]);

      // Verify the query filters by status and end_date
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'open'"),
        undefined
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('end_date > NOW()'),
        undefined
      );
    });

    it('should return empty array when no games are available', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await lobbyService.getAvailableGames();

      expect(result).toEqual([]);
    });
  });

  describe('registerPlayer', () => {
    it('should successfully register a player when all conditions are met', async () => {
      const mockClient = {
        query: vi.fn(),
      };

      // Setup mock transaction to execute the callback with the mock client
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => {
        return cb(mockClient);
      });

      // Game exists and is open
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 'game-1', max_players: 3, buy_in: 1, status: 'open', end_date: new Date('2099-01-01') }],
        })
        // Current count is 1
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        // Player not already registered
        .mockResolvedValueOnce({ rows: [] })
        // Player has sufficient balance
        .mockResolvedValueOnce({ rows: [{ balance: 100 }] })
        // Deduct buy-in
        .mockResolvedValueOnce({ rowCount: 1 })
        // Insert registration
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await lobbyService.registerPlayer('player-1', 'game-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Registration successful');
      expect(result.playerCount).toBe(2);
    });

    it('should fail when game is not found', async () => {
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => cb(mockClient));

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await lobbyService.registerPlayer('player-1', 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Game not found');
    });

    it('should fail when game is full', async () => {
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => cb(mockClient));

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 'game-1', max_players: 3, buy_in: 1, status: 'open', end_date: new Date('2099-01-01') }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const result = await lobbyService.registerPlayer('player-1', 'game-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Game is full');
      expect(result.playerCount).toBe(3);
    });

    it('should fail when player is already registered', async () => {
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => cb(mockClient));

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 'game-1', max_players: 3, buy_in: 1, status: 'open', end_date: new Date('2099-01-01') }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'reg-1' }] });

      const result = await lobbyService.registerPlayer('player-1', 'game-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Player is already registered for this game');
    });

    it('should fail when player has insufficient balance', async () => {
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => cb(mockClient));

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 'game-1', max_players: 3, buy_in: 1, status: 'open', end_date: new Date('2099-01-01') }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ balance: 0 }] });

      const result = await lobbyService.registerPlayer('player-1', 'game-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Insufficient balance');
    });

    it('should update game status to full when max players reached', async () => {
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => cb(mockClient));

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 'game-1', max_players: 3, buy_in: 1, status: 'open', end_date: new Date('2099-01-01') }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ balance: 100 }] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        // Update status to full
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await lobbyService.registerPlayer('player-1', 'game-1');

      expect(result.success).toBe(true);
      expect(result.playerCount).toBe(3);
      // Verify the status update query was called
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'full'"),
        ['game-1']
      );
    });

    it('should fail when game status is not open', async () => {
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => cb(mockClient));

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'game-1', max_players: 3, buy_in: 1, status: 'in_progress', end_date: new Date('2099-01-01') }],
      });

      const result = await lobbyService.registerPlayer('player-1', 'game-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Game is not open for registration');
    });
  });

  describe('unregisterPlayer', () => {
    it('should successfully unregister a player and refund buy-in', async () => {
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => cb(mockClient));

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 'game-1', buy_in: 1, status: 'open' }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'reg-1' }] })
        // Delete registration
        .mockResolvedValueOnce({ rowCount: 1 })
        // Refund buy-in
        .mockResolvedValueOnce({ rowCount: 1 })
        // Get updated count
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await lobbyService.unregisterPlayer('player-1', 'game-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Unregistration successful');
      expect(result.playerCount).toBe(1);
    });

    it('should fail when game is not found', async () => {
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => cb(mockClient));

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await lobbyService.unregisterPlayer('player-1', 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Game not found');
    });

    it('should fail when player is not registered', async () => {
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => cb(mockClient));

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 'game-1', buy_in: 1, status: 'open' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await lobbyService.unregisterPlayer('player-1', 'game-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Player is not registered for this game');
    });

    it('should set game status back to open if it was full', async () => {
      const mockClient = { query: vi.fn() };
      mockTransaction.mockImplementation(async (cb: (client: typeof mockClient) => Promise<unknown>) => cb(mockClient));

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 'game-1', buy_in: 1, status: 'full' }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'reg-1' }] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        // Update status back to open
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await lobbyService.unregisterPlayer('player-1', 'game-1');

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'open'"),
        ['game-1']
      );
    });
  });

  describe('emitLobbyUpdate', () => {
    it('should emit lobby:update event with correct payload', () => {
      lobbyService.emitLobbyUpdate('game-1', 2, 'open');

      expect(io.emit).toHaveBeenCalledWith('lobby:update', {
        gameId: 'game-1',
        playerCount: 2,
        status: 'open',
      });
    });

    it('should emit with full status when game is full', () => {
      lobbyService.emitLobbyUpdate('game-1', 3, 'full');

      expect(io.emit).toHaveBeenCalledWith('lobby:update', {
        gameId: 'game-1',
        playerCount: 3,
        status: 'full',
      });
    });
  });
});
