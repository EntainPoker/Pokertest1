/**
 * Tournament Elimination and Completion Logic
 *
 * Handles detecting player eliminations (chip count reaches 0),
 * assigning finishing positions, handling simultaneous eliminations,
 * and declaring tournament winners with prize distribution.
 */

// ============================================================
// Types
// ============================================================

/** Player data needed for elimination checks */
export interface EliminationPlayer {
  playerId: string;
  username: string;
  chipCount: number; // chips after the hand
  startingChipsThisHand: number; // chips at start of the hand (for tiebreaker)
}

/** Result of checking for eliminations after a hand */
export interface EliminationResult {
  eliminatedPlayers: { playerId: string; position: number }[];
  remainingPlayers: string[];
}

/** Result when tournament is complete (one player remaining) */
export interface TournamentCompletionResult {
  winnerId: string;
  winnerUsername: string;
  standings: { playerId: string; username: string; position: number }[];
  prizePool: number; // $3 for 3-player tournament
}

// ============================================================
// Constants
// ============================================================

/** Buy-in amount per player in play money */
const BUY_IN = 1;

// ============================================================
// Core Functions
// ============================================================

/**
 * Check for player eliminations after a hand completes.
 *
 * Detects players with 0 chips and assigns finishing positions.
 * For a 3-player tournament:
 * - First eliminated = 3rd place
 * - Second eliminated = 2nd place
 *
 * If multiple players are eliminated simultaneously, the player
 * who had more chips at the start of the hand gets the higher
 * (better) finishing position.
 *
 * @param players - All players with their chip counts after the hand
 * @param previouslyEliminated - Number of players already eliminated before this hand
 * @returns Elimination result with eliminated players and their positions
 */
export function checkEliminations(
  players: EliminationPlayer[],
  previouslyEliminated: number = 0
): EliminationResult {
  const totalPlayers = players.length + previouslyEliminated;

  // Find players who just got eliminated (chip count = 0)
  const newlyEliminated = players.filter((p) => p.chipCount === 0);
  const remaining = players.filter((p) => p.chipCount > 0);

  if (newlyEliminated.length === 0) {
    return {
      eliminatedPlayers: [],
      remainingPlayers: remaining.map((p) => p.playerId),
    };
  }

  // Sort eliminated players by startingChipsThisHand descending
  // Player with MORE chips at hand start gets the HIGHER (better) position
  const sortedEliminated = [...newlyEliminated].sort(
    (a, b) => b.startingChipsThisHand - a.startingChipsThisHand
  );

  // Assign positions: positions count down from totalPlayers
  // The first eliminated in the tournament gets the worst position (e.g., 3rd in a 3-player game)
  // previouslyEliminated tells us how many are already out
  // So the next position to assign is: totalPlayers - previouslyEliminated
  // For simultaneous eliminations, the one with more starting chips gets the better (lower number) position
  const eliminatedWithPositions = sortedEliminated.map((player, index) => {
    // Position starts at (totalPlayers - previouslyEliminated) for the worst position in this batch
    // and decreases for better positions
    const position = totalPlayers - previouslyEliminated - index;
    return {
      playerId: player.playerId,
      position,
    };
  });

  return {
    eliminatedPlayers: eliminatedWithPositions,
    remainingPlayers: remaining.map((p) => p.playerId),
  };
}

/**
 * Check if the tournament is complete (only one player remains with chips).
 *
 * @param players - All players with their current chip counts
 * @returns Tournament completion result if complete, null if tournament continues
 */
export function checkTournamentComplete(
  players: EliminationPlayer[]
): TournamentCompletionResult | null {
  const activePlayers = players.filter((p) => p.chipCount > 0);

  // Tournament continues if 2 or more players have chips
  if (activePlayers.length !== 1) {
    return null;
  }

  const winner = activePlayers[0];
  const totalPlayers = players.length;
  const prizePool = totalPlayers * BUY_IN;

  // Build standings: winner is 1st, eliminated players get positions based on chips
  // For the final hand, we need to assign positions to everyone
  const eliminatedPlayers = players.filter((p) => p.chipCount === 0);

  // Sort eliminated by startingChipsThisHand descending (more chips = better position)
  const sortedEliminated = [...eliminatedPlayers].sort(
    (a, b) => b.startingChipsThisHand - a.startingChipsThisHand
  );

  const standings: { playerId: string; username: string; position: number }[] = [
    { playerId: winner.playerId, username: winner.username, position: 1 },
  ];

  // Assign positions 2, 3, ... to eliminated players
  sortedEliminated.forEach((player, index) => {
    standings.push({
      playerId: player.playerId,
      username: player.username,
      position: index + 2,
    });
  });

  return {
    winnerId: winner.playerId,
    winnerUsername: winner.username,
    standings,
    prizePool,
  };
}
