import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = Router();
router.use(authMiddleware);

router.get('/:gameId/last-hand', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;

    const tournamentResult = query(
      'SELECT id FROM tournaments WHERE game_instance_id = ? ORDER BY started_at DESC LIMIT 1',
      [gameId]
    );

    if (tournamentResult.rows.length === 0) {
      res.status(200).json({ hand: null, message: 'No hand history available' });
      return;
    }

    const tournamentId = tournamentResult.rows[0].id;
    const handResult = query(
      'SELECT * FROM hand_histories WHERE tournament_id = ? ORDER BY hand_number DESC LIMIT 1',
      [tournamentId]
    );

    if (handResult.rows.length === 0) {
      res.status(200).json({ hand: null, message: 'No hand history available' });
      return;
    }

    const row = handResult.rows[0];
    res.status(200).json({
      hand: {
        handId: row.id,
        tournamentId: row.tournament_id,
        handNumber: row.hand_number,
        blindLevel: { level: 1, smallBlind: 10, bigBlind: 20 },
        players: JSON.parse(row.players || '[]'),
        communityCards: JSON.parse(row.community_cards || '[]'),
        actions: JSON.parse(row.actions || '[]'),
        pots: [{ amount: row.pot_total, winnerId: '' }],
        result: JSON.parse(row.result || '{}'),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch hand history';
    res.status(500).json({ error: 'Internal server error', message, statusCode: 500 });
  }
});

router.get('/:gameId/hands', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const handNumber = parseInt(req.query.handNumber as string, 10);

    if (isNaN(handNumber) || handNumber < 1) {
      res.status(200).json({ hand: null, message: 'Invalid hand number' });
      return;
    }

    const tournamentResult = query(
      'SELECT id FROM tournaments WHERE game_instance_id = ? ORDER BY started_at DESC LIMIT 1',
      [gameId]
    );

    if (tournamentResult.rows.length === 0) {
      res.status(200).json({ hand: null, message: 'No hand history available' });
      return;
    }

    const tournamentId = tournamentResult.rows[0].id;
    const handResult = query(
      'SELECT * FROM hand_histories WHERE tournament_id = ? AND hand_number = ? LIMIT 1',
      [tournamentId, handNumber]
    );

    if (handResult.rows.length === 0) {
      res.status(200).json({ hand: null, message: `Hand #${handNumber} not found` });
      return;
    }

    const row = handResult.rows[0];
    res.status(200).json({
      hand: {
        handId: row.id,
        tournamentId: row.tournament_id,
        handNumber: row.hand_number,
        blindLevel: { level: 1, smallBlind: 10, bigBlind: 20 },
        players: JSON.parse(row.players || '[]'),
        communityCards: JSON.parse(row.community_cards || '[]'),
        actions: JSON.parse(row.actions || '[]'),
        pots: [{ amount: row.pot_total, winnerId: '' }],
        result: JSON.parse(row.result || '{}'),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch hand history';
    res.status(500).json({ error: 'Internal server error', message, statusCode: 500 });
  }
});

export default router;
