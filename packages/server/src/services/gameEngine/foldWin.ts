import { Card, HandResult } from '@spin-and-go/shared';

// ============================================================
// Types
// ============================================================

/** Input player data for fold-win check */
export interface FoldWinPlayer {
  playerId: string;
  username: string;
  status: 'active' | 'folded' | 'all_in';
  holeCards: Card[];
}

/** Result when a player wins by all others folding */
export interface FoldWinResult {
  winnerId: string;
  handResult: HandResult;
  playerResults: { playerId: string; holeCards: Card[] | null }[];
}

// ============================================================
// Fold-Win Logic
// ============================================================

/**
 * Check if all players except one have folded.
 * Returns the winner result if exactly one player remains (active or all-in),
 * or null if the hand should continue.
 */
export function checkFoldWin(players: FoldWinPlayer[]): FoldWinResult | null {
  const nonFoldedPlayers = players.filter(p => p.status !== 'folded');

  // If more than one player hasn't folded, the hand continues
  if (nonFoldedPlayers.length !== 1) {
    return null;
  }

  const winner = nonFoldedPlayers[0];

  const handResult: HandResult = {
    winnerId: winner.playerId,
    winningHand: null,
    method: 'fold',
  };

  // Folded players get null hole cards (not revealed)
  // Winner also gets null hole cards (no need to reveal when winning by fold)
  const playerResults = players.map(p => ({
    playerId: p.playerId,
    holeCards: null,
  }));

  return {
    winnerId: winner.playerId,
    handResult,
    playerResults,
  };
}
