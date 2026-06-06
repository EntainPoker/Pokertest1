import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/history/player
 * Returns the last 50 hands the authenticated player participated in.
 */
router.get('/player', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const playerId = req.player?.playerId;
    if (!playerId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Player not found', statusCode: 401 });
      return;
    }

    // Query hand_histories where player is in the players JSON array
    // The players column stores a JSON array of player objects with playerId field
    const result = query(
      `SELECT id, hand_number, played_at, players, result, pot_total
       FROM hand_histories
       WHERE players LIKE ?
       ORDER BY played_at DESC
       LIMIT 50`,
      [`%${playerId}%`]
    );

    const hands = result.rows.map((row: any) => {
      const players = JSON.parse(row.players || '[]');
      const resultData = JSON.parse(row.result || '{}');

      // Determine if this player won
      const winnerId = resultData.winnerId || resultData.winner?.playerId || '';
      const isWin = winnerId === playerId;

      // Calculate net chip change for this player
      let netChipChange = 0;
      if (isWin) {
        // Winner gains the pot minus their own contribution
        // Approximate: pot_total minus buy-in (we'll use pot as net gain for simplicity)
        netChipChange = row.pot_total || 0;
      } else {
        // Loser — find their total bet from the result or estimate
        if (resultData.playerResults) {
          const playerResult = resultData.playerResults.find((pr: any) => pr.playerId === playerId);
          netChipChange = playerResult?.netChange ?? -(row.pot_total / Math.max(players.length - 1, 1));
        } else {
          // Estimate loss as their portion of the pot
          netChipChange = -(row.pot_total / Math.max(players.length, 2));
        }
      }

      // Get winning hand type if available
      let winningHand: string | null = null;
      if (isWin && resultData.handName) {
        winningHand = resultData.handName;
      } else if (isWin && resultData.winningHand) {
        winningHand = resultData.winningHand;
      }

      return {
        handId: row.id,
        handNumber: row.hand_number,
        playedAt: row.played_at,
        result: isWin ? 'win' : 'loss',
        netChipChange: Math.round(netChipChange),
        winningHand,
      };
    });

    res.status(200).json({ hands });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch player history';
    res.status(500).json({ error: 'Internal server error', message, statusCode: 500 });
  }
});

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
