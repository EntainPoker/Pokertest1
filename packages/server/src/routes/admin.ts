import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import * as adminService from '../services/adminService.js';
import type { GameCreationRequest } from '@spin-and-go/shared';

const router = Router();

// ──────────────────────────────────────────────────────────────────
// Admin authentication endpoints (NO auth middleware — separate system)
// ──────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/login
 * Authenticate an admin account (separate from player login).
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required' });
      return;
    }

    const result = query('SELECT * FROM admin_accounts WHERE username = ?', [username]);
    if (result.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const admin = result.rows[0];
    const passwordValid = await bcrypt.compare(password, admin.password_hash);
    if (!passwordValid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    res.status(200).json({ success: true, admin: { username: admin.username } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(500).json({ success: false, message });
  }
});

/**
 * GET /api/admin/players
 * List all player accounts (for admin panel).
 */
router.get('/players', async (_req: Request, res: Response) => {
  try {
    const result = query(
      'SELECT id, username, balance, is_test_account, created_at, last_login_at FROM players ORDER BY created_at DESC',
      []
    );
    res.status(200).json({ players: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list players';
    res.status(500).json({ error: 'Failed to list players', message });
  }
});

// ──────────────────────────────────────────────────────────────────
// Game management endpoints (no player auth — admin uses own auth)
// ──────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/games
 * Create a new game instance.
 */
router.post('/games', async (req: Request, res: Response) => {
  try {
    const { name, maxPlayers, blindIntervalMinutes, maxBlindLevel, startingChips, tableTheme } = req.body as GameCreationRequest;

    // Validate parameters before creating
    const validation = adminService.validateGameCreationParams(name, maxPlayers);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        message: validation.errors.join('; '),
        statusCode: 400,
      });
      return;
    }

    const game = adminService.createGameInstance(
      name,
      maxPlayers,
      'admin',
      blindIntervalMinutes || 3,
      startingChips || 500,
    );

    res.status(201).json({ game });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create game instance';
    res.status(400).json({
      error: 'Game creation failed',
      message,
      statusCode: 400,
    });
  }
});

/**
 * GET /api/admin/games
 * List all game instances. Supports optional ?status= query param filter.
 */
router.get('/games', async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const games = adminService.listGameInstances(statusFilter);

    res.status(200).json({ games });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list game instances';
    res.status(500).json({
      error: 'Failed to list games',
      message,
      statusCode: 500,
    });
  }
});

/**
 * DELETE /api/admin/games/:id
 * Remove a game instance.
 */
router.delete('/games/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    adminService.removeGameInstance(id);

    res.status(200).json({ message: 'Game instance removed successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove game instance';

    if (message === 'Game instance not found') {
      res.status(404).json({
        error: 'Not found',
        message,
        statusCode: 404,
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to remove game',
      message,
      statusCode: 500,
    });
  }
});

export default router;
