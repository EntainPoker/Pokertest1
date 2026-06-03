import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pg module before importing database
vi.mock('pg', () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const mockPool = {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn().mockResolvedValue(mockClient),
    on: vi.fn(),
  };
  return {
    default: { Pool: vi.fn(() => mockPool) },
    Pool: vi.fn(() => mockPool),
  };
});

describe('Database Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export pool, query, getClient, and transaction functions', async () => {
    const db = await import('./database.js');
    expect(db.pool).toBeDefined();
    expect(db.query).toBeDefined();
    expect(typeof db.query).toBe('function');
    expect(db.getClient).toBeDefined();
    expect(typeof db.getClient).toBe('function');
    expect(db.transaction).toBeDefined();
    expect(typeof db.transaction).toBe('function');
  });

  it('should execute a query and return results', async () => {
    const db = await import('./database.js');
    const result = await db.query('SELECT 1');
    expect(result).toBeDefined();
    expect(result.rows).toEqual([]);
  });

  it('should get a client from the pool', async () => {
    const db = await import('./database.js');
    const client = await db.getClient();
    expect(client).toBeDefined();
    expect(client.query).toBeDefined();
    expect(client.release).toBeDefined();
  });

  it('should handle transactions with commit on success', async () => {
    const db = await import('./database.js');
    const client = await db.pool.connect();

    const result = await db.transaction(async (txClient) => {
      await txClient.query('INSERT INTO test VALUES ($1)', ['value']);
      return 'success';
    });

    expect(result).toBe('success');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('should handle transactions with rollback on error', async () => {
    const db = await import('./database.js');
    const client = await db.pool.connect();
    (client.query as ReturnType<typeof vi.fn>).mockImplementationOnce(() => Promise.resolve()) // BEGIN
      .mockImplementationOnce(() => { throw new Error('DB error'); }); // The callback query

    await expect(
      db.transaction(async (txClient) => {
        await txClient.query('INVALID SQL');
      })
    ).rejects.toThrow('DB error');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});
