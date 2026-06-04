import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import * as lobbyService from '../services/lobbyService.js';
import { checkAndStartTournament } from '../services/tournamentService.js';
import { query } from '../config/database.js';

const router = Router();
router.use(authMiddleware);

router.get('/games', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const games = lobbyService.getAvailableGames();
    res.status(200).json({ games });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch games';
    res.status(500).json({ error: 'Internal server error', message, statusCode: 500 });
  }
});

router.post('/games/:id/register', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const gameId = req.params.id;
    const playerId = req.player!.playerId;
    const result = lobbyService.registerPlayer(playerId, gameId);

    if (!result.success) {
      res.status(400).json({ error: 'Registration failed', message: result.message, statusCode: 400 });
      return;
    }

    // Get game's maxPlayers to determine if it's full
    const gameResult = query('SELECT max_players FROM game_instances WHERE id = ?', [gameId]);
    const maxPlayers = gameResult.rows.length > 0 ? (gameResult.rows[0].max_players as number) : 3;

    const status = result.playerCount >= maxPlayers ? 'full' : 'open';
    lobbyService.emitLobbyUpdate(gameId, result.playerCount, status);
    res.status(200).json(result);

    // If game is now full, start the tournament
    if (result.playerCount >= maxPlayers) {
      try {
        checkAndStartTournament(gameId);
      } catch (err) {
        console.error('Failed to start tournament:', err);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(500).json({ error: 'Internal server error', message, statusCode: 500 });
  }
});

router.delete('/games/:id/register', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const gameId = req.params.id;
    const playerId = req.player!.playerId;
    const result = lobbyService.unregisterPlayer(playerId, gameId);

    if (!result.success) {
      res.status(400).json({ error: 'Unregistration failed', message: result.message, statusCode: 400 });
      return;
    }

    lobbyService.emitLobbyUpdate(gameId, result.playerCount, 'open');
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unregistration failed';
    res.status(500).json({ error: 'Internal server error', message, statusCode: 500 });
  }
});

export default router;
