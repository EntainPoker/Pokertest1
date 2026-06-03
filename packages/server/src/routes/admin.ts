import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import * as adminService from '../services/adminService.js';
import type { GameCreationRequest } from '@spin-and-go/shared';

const router = Router();

// All admin routes require authentication
router.use(authMiddleware);

/**
 * POST /api/admin/games
 * Create a new game instance.
 * Validates name (non-empty) and maxPlayers (2-6).
 * Auto-sets: format=texas_holdem, blindIntervalMinutes=3, startingChips=500, buyIn=1, endDate=NOW()+30 days, status=open.
 */
router.post('/games', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, maxPlayers } = req.body as GameCreationRequest;
    const createdBy = req.player!.playerId;

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

    const game = await adminService.createGameInstance(name, maxPlayers, createdBy);

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
router.get('/games', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const games = await adminService.listGameInstances(statusFilter);

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
 * Remove a game instance. If it has registrations, unregisters players and refunds buy-ins first.
 */
router.delete('/games/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    await adminService.removeGameInstance(id);

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
