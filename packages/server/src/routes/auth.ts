import { Router, Request, Response } from 'express';
import * as authService from '../services/authService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { query } from '../config/database.js';
import type { RegisterRequest, LoginRequest, RefreshTokenRequest } from '@spin-and-go/shared';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new player account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as RegisterRequest;

    const result = await authService.register(username, password);

    res.status(201).json({
      player: result.player,
      tokens: result.tokens,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';

    // Determine appropriate status code
    let statusCode = 400;
    if (message === 'Username is already taken') {
      statusCode = 409;
    }

    res.status(statusCode).json({
      error: 'Registration failed',
      message,
      statusCode,
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate a player
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequest;

    const result = await authService.login(username, password);

    res.status(200).json({
      player: result.player,
      tokens: result.tokens,
    });
  } catch (error) {
    // Always return 401 with generic message for login failures
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid username or password',
      statusCode: 401,
    });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate the refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };

    if (!refreshToken) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Refresh token is required',
        statusCode: 400,
      });
      return;
    }

    await authService.logout(refreshToken);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout',
      statusCode: 500,
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh the access token using a valid refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as RefreshTokenRequest;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Refresh token is required',
        statusCode: 400,
      });
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.status(200).json({ tokens });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token refresh failed';

    res.status(401).json({
      error: 'Token refresh failed',
      message,
      statusCode: 401,
    });
  }
});

/**
 * GET /api/auth/me
 * Return the current authenticated player's profile (including real balance)
 */
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const playerId = req.player?.playerId;
    if (!playerId) {
      res.status(401).json({ error: 'Unauthorized', message: 'No player info', statusCode: 401 });
      return;
    }

    const result = query('SELECT id, username, balance, created_at, last_login_at, is_test_account FROM players WHERE id = ?', [playerId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found', message: 'Player not found', statusCode: 404 });
      return;
    }

    const row = result.rows[0];
    res.status(200).json({
      player: {
        id: row.id,
        username: row.username,
        balance: row.balance,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        isTestAccount: Boolean(row.is_test_account),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: 'Failed to fetch profile', statusCode: 500 });
  }
});

export default router;
