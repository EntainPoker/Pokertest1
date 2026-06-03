import type { SidePot } from '@spin-and-go/shared';

/**
 * Represents a player's contribution data for pot calculation.
 */
export interface PotPlayer {
  playerId: string;
  totalBetThisHand: number;
  status: 'active' | 'folded' | 'all_in';
}

/**
 * Calculates the main pot and any side pots based on player contributions.
 *
 * Logic:
 * - Sort players by their total bet amount (ascending)
 * - For each unique bet level where a player is all-in:
 *   - Create a pot containing contributions from all players up to that level
 *   - Only non-folded players at or above that level are eligible
 * - The final pot contains remaining contributions from players who bet more
 *   than the highest all-in
 * - Folded players contribute to pots but are NOT eligible to win them
 *
 * @param players - Array of players with their bet totals and statuses
 * @returns Array of SidePot objects (first element is the main pot)
 */
export function calculateSidePots(players: PotPlayer[]): SidePot[] {
  // Filter out players who contributed nothing
  const contributors = players.filter((p) => p.totalBetThisHand > 0);

  if (contributors.length === 0) {
    return [];
  }

  // Get unique all-in bet levels sorted ascending
  const allInLevels = contributors
    .filter((p) => p.status === 'all_in')
    .map((p) => p.totalBetThisHand)
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((a, b) => a - b);

  // If no one is all-in, there's just one pot
  if (allInLevels.length === 0) {
    const totalAmount = contributors.reduce((sum, p) => sum + p.totalBetThisHand, 0);
    const eligiblePlayerIds = contributors
      .filter((p) => p.status !== 'folded')
      .map((p) => p.playerId);

    if (totalAmount === 0) {
      return [];
    }

    return [{ amount: totalAmount, eligiblePlayerIds }];
  }

  const pots: SidePot[] = [];
  let previousLevel = 0;

  for (const level of allInLevels) {
    const contribution = level - previousLevel;

    if (contribution <= 0) {
      continue;
    }

    // Each player contributes up to `contribution` from their remaining bet
    let potAmount = 0;
    for (const player of contributors) {
      const playerRemaining = player.totalBetThisHand - previousLevel;
      if (playerRemaining > 0) {
        potAmount += Math.min(playerRemaining, contribution);
      }
    }

    // Eligible players: non-folded players whose total bet >= this level
    const eligiblePlayerIds = contributors
      .filter((p) => p.status !== 'folded' && p.totalBetThisHand >= level)
      .map((p) => p.playerId);

    if (potAmount > 0 && eligiblePlayerIds.length > 0) {
      pots.push({ amount: potAmount, eligiblePlayerIds });
    }

    previousLevel = level;
  }

  // Final pot: remaining contributions above the highest all-in level
  const highestAllIn = allInLevels[allInLevels.length - 1];
  let remainingAmount = 0;
  for (const player of contributors) {
    const excess = player.totalBetThisHand - highestAllIn;
    if (excess > 0) {
      remainingAmount += excess;
    }
  }

  if (remainingAmount > 0) {
    const eligiblePlayerIds = contributors
      .filter((p) => p.status !== 'folded' && p.totalBetThisHand > highestAllIn)
      .map((p) => p.playerId);

    if (eligiblePlayerIds.length > 0) {
      pots.push({ amount: remainingAmount, eligiblePlayerIds });
    }
  }

  return pots;
}
