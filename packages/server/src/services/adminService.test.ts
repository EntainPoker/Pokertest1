import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateGameCreationParams } from './adminService.js';

// Mock the database module
vi.mock('../config/database.js', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

describe('Admin Service - validateGameCreationParams', () => {
  describe('valid inputs', () => {
    it('should accept a non-empty name and maxPlayers between 2-6', () => {
      expect(validateGameCreationParams('My Game', 3)).toEqual({ valid: true, errors: [] });
      expect(validateGameCreationParams('Tournament', 2)).toEqual({ valid: true, errors: [] });
      expect(validateGameCreationParams('Big Game', 6)).toEqual({ valid: true, errors: [] });
    });

    it('should accept names with special characters', () => {
      expect(validateGameCreationParams('Game #1!', 3)).toEqual({ valid: true, errors: [] });
      expect(validateGameCreationParams('Spin & Go', 3)).toEqual({ valid: true, errors: [] });
    });
  });

  describe('invalid name', () => {
    it('should reject empty string name', () => {
      const result = validateGameCreationParams('', 3);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Game name');
    });

    it('should reject whitespace-only name', () => {
      const result = validateGameCreationParams('   ', 3);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Game name');
    });

    it('should reject null/undefined name', () => {
      const result = validateGameCreationParams(null as unknown as string, 3);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Game name');
    });
  });

  describe('invalid maxPlayers', () => {
    it('should reject maxPlayers less than 2', () => {
      const result = validateGameCreationParams('Game', 1);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('between 2 and 6');
    });

    it('should reject maxPlayers greater than 6', () => {
      const result = validateGameCreationParams('Game', 7);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('between 2 and 6');
    });

    it('should reject non-integer maxPlayers', () => {
      const result = validateGameCreationParams('Game', 3.5);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('between 2 and 6');
    });

    it('should reject null/undefined maxPlayers', () => {
      const result = validateGameCreationParams('Game', null as unknown as number);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Player count');
    });
  });

  describe('multiple errors', () => {
    it('should return multiple errors when both params are invalid', () => {
      const result = validateGameCreationParams('', 10);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });
});

describe('Admin Service - createGameInstance', () => {
  let adminService: typeof import('./adminService.js');
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();

    const dbModule = await import('../config/database.js');
    mockQuery = dbModule.query as unknown as ReturnType<typeof vi.fn>;

    adminService = await import('./adminService.js');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create a game instance with correct auto-set parameters', async () => {
    const now = new Date('2024-01-15T12:00:00.000Z');
    vi.setSystemTime(now);

    const expectedEndDate = new Date('2024-02-14T12:00:00.000Z');

    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'test-uuid',
          name: 'Spin and Go',
          format: 'texas_holdem',
          max_players: 3,
          buy_in: 1,
          starting_chips: 500,
          blind_interval_minutes: 3,
          status: 'open',
          created_at: now,
          end_date: expectedEndDate,
          created_by: 'admin-id',
        }],
      })
      .mockResolvedValueOnce({
        rows: [],
      });

    const game = await adminService.createGameInstance('Spin and Go', 3, 'admin-id');

    expect(game.format).toBe('texas_holdem');
    expect(game.buyIn).toBe(1);
    expect(game.startingChips).toBe(500);
    expect(game.blindIntervalMinutes).toBe(3);
    expect(game.status).toBe('open');
    expect(game.name).toBe('Spin and Go');
    expect(game.maxPlayers).toBe(3);
    expect(game.registeredPlayers).toEqual([]);
  });

  it('should throw error for invalid parameters', async () => {
    await expect(adminService.createGameInstance('', 3, 'admin-id')).rejects.toThrow('Game name');
    await expect(adminService.createGameInstance('Game', 10, 'admin-id')).rejects.toThrow('between 2 and 6');
  });
});

describe('Admin Service - listGameInstances', () => {
  let adminService: typeof import('./adminService.js');
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    const dbModule = await import('../config/database.js');
    mockQuery = dbModule.query as unknown as ReturnType<typeof vi.fn>;

    adminService = await import('./adminService.js');
  });

  it('should return all game instances when no filter provided', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'game-1',
          name: 'Game 1',
          format: 'texas_holdem',
          max_players: 3,
          buy_in: 1,
          starting_chips: 500,
          blind_interval_minutes: 3,
          status: 'open',
          created_at: new Date(),
          end_date: new Date(),
          created_by: 'admin-id',
          registered_players: [],
        },
      ],
    });

    const games = await adminService.listGameInstances();
    expect(games).toHaveLength(1);
    expect(games[0].name).toBe('Game 1');
  });

  it('should pass status filter to query when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await adminService.listGameInstances('open');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE gi.status = $1'),
      ['open']
    );
  });
});

describe('Admin Service - removeGameInstance', () => {
  let adminService: typeof import('./adminService.js');
  let mockTransaction: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    const dbModule = await import('../config/database.js');
    mockTransaction = dbModule.transaction as unknown as ReturnType<typeof vi.fn>;

    adminService = await import('./adminService.js');
  });

  it('should throw error when game not found', async () => {
    mockTransaction.mockImplementation(async (callback: (client: unknown) => Promise<void>) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [] }), // game not found
      };
      return callback(mockClient);
    });

    await expect(adminService.removeGameInstance('non-existent')).rejects.toThrow('Game instance not found');
  });

  it('should refund players and delete game with registrations', async () => {
    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'game-1' }] }) // game exists
        .mockResolvedValueOnce({ rows: [{ player_id: 'p1' }, { player_id: 'p2' }] }) // registrations
        .mockResolvedValueOnce({ rows: [] }) // refund p1
        .mockResolvedValueOnce({ rows: [] }) // refund p2
        .mockResolvedValueOnce({ rows: [] }) // delete registrations
        .mockResolvedValueOnce({ rows: [] }), // delete game
    };

    mockTransaction.mockImplementation(async (callback: (client: unknown) => Promise<void>) => {
      return callback(mockClient);
    });

    await adminService.removeGameInstance('game-1');

    // Verify refunds were issued
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE players SET balance = balance + 1 WHERE id = $1',
      ['p1']
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE players SET balance = balance + 1 WHERE id = $1',
      ['p2']
    );
  });
});

describe('Admin Service - cleanupExpiredGames', () => {
  let adminService: typeof import('./adminService.js');
  let mockQuery: ReturnType<typeof vi.fn>;
  let mockTransaction: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    const dbModule = await import('../config/database.js');
    mockQuery = dbModule.query as unknown as ReturnType<typeof vi.fn>;
    mockTransaction = dbModule.transaction as unknown as ReturnType<typeof vi.fn>;

    adminService = await import('./adminService.js');
  });

  it('should remove expired games with no registrations', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'expired-game', buy_in: 1 }],
    });

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] }) // no registrations
        .mockResolvedValueOnce({ rows: [] }) // delete registrations (no-op)
        .mockResolvedValueOnce({ rows: [] }), // delete game
    };

    mockTransaction.mockImplementation(async (callback: (client: unknown) => Promise<void>) => {
      return callback(mockClient);
    });

    const count = await adminService.cleanupExpiredGames();
    expect(count).toBe(1);
  });

  it('should refund players for expired games with registrations', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'expired-game', buy_in: 1 }],
    });

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ player_id: 'p1' }] }) // 1 registration
        .mockResolvedValueOnce({ rows: [] }) // refund p1
        .mockResolvedValueOnce({ rows: [] }) // delete registrations
        .mockResolvedValueOnce({ rows: [] }), // delete game
    };

    mockTransaction.mockImplementation(async (callback: (client: unknown) => Promise<void>) => {
      return callback(mockClient);
    });

    const count = await adminService.cleanupExpiredGames();
    expect(count).toBe(1);

    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE players SET balance = balance + $1 WHERE id = $2',
      [1, 'p1']
    );
  });

  it('should not remove games that are in_progress', async () => {
    // The query itself filters out in_progress games
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const count = await adminService.cleanupExpiredGames();
    expect(count).toBe(0);

    // Verify the query filters by status
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status != 'in_progress'")
    );
  });

  it('should return 0 when no expired games exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const count = await adminService.cleanupExpiredGames();
    expect(count).toBe(0);
  });
});

describe('Admin Service - startCleanupJob / stopCleanupJob', () => {
  let adminService: typeof import('./adminService.js');
  let mockQuery: ReturnType<typeof vi.fn>;
  let mockTransaction: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();

    const dbModule = await import('../config/database.js');
    mockQuery = dbModule.query as unknown as ReturnType<typeof vi.fn>;
    mockTransaction = dbModule.transaction as unknown as ReturnType<typeof vi.fn>;

    // Default: no expired games
    mockQuery.mockResolvedValue({ rows: [] });
    mockTransaction.mockResolvedValue(undefined);

    adminService = await import('./adminService.js');
  });

  afterEach(() => {
    adminService.stopCleanupJob();
    vi.useRealTimers();
  });

  it('should run cleanup immediately on start', async () => {
    adminService.startCleanupJob();

    // Allow the immediate async call to resolve
    await vi.runAllTimersAsync();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("end_date < NOW()")
    );
  });

  it('should run cleanup every 60 seconds', async () => {
    adminService.startCleanupJob();

    // Initial call
    await vi.runAllTimersAsync();
    const initialCallCount = mockQuery.mock.calls.length;

    // Advance 60 seconds
    await vi.advanceTimersByTimeAsync(60_000);

    expect(mockQuery.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('should stop the interval when stopCleanupJob is called', async () => {
    adminService.startCleanupJob();
    await vi.runAllTimersAsync();

    adminService.stopCleanupJob();
    const callCountAfterStop = mockQuery.mock.calls.length;

    await vi.advanceTimersByTimeAsync(120_000);

    expect(mockQuery.mock.calls.length).toBe(callCountAfterStop);
  });
});
