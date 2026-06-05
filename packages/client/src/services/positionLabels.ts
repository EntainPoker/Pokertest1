/**
 * Position label calculator per Rule 19, 83 of the poker spec.
 * Assigns position names (BTN, SB, BB, UTG, HJ, CO, etc.) based on
 * dealer position and player count.
 *
 * Labels update every hand based on dealer position.
 */

export type PositionLabel = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'MP' | 'MP+1' | 'HJ' | 'CO';

/**
 * Returns a map of playerIndex → position label for the current hand.
 *
 * Position assignments per table size (from spec Rule 4):
 * - 2-handed: BTN/SB, BB
 * - 3-handed: BTN, SB, BB
 * - 4-handed: BTN, SB, BB, UTG
 * - 5-handed: BTN, SB, BB, UTG, CO
 * - 6-handed: BTN, SB, BB, UTG, HJ, CO
 * - 7-handed: BTN, SB, BB, UTG, UTG+1, HJ, CO
 * - 8-handed: BTN, SB, BB, UTG, UTG+1, MP, HJ, CO
 * - 9-handed: BTN, SB, BB, UTG, UTG+1, MP, MP+1, HJ, CO
 */
export function getPositionLabels(
  playerCount: number,
  dealerPosition: number,
  smallBlindPosition: number,
  bigBlindPosition: number
): Map<number, PositionLabel> {
  const labels = new Map<number, PositionLabel>();

  if (playerCount < 2) return labels;

  // Heads-up: dealer is also SB (per Rule 10)
  if (playerCount === 2) {
    labels.set(dealerPosition, 'BTN');
    labels.set(bigBlindPosition, 'BB');
    return labels;
  }

  // 3+ players: BTN, SB, BB are fixed
  labels.set(dealerPosition, 'BTN');
  labels.set(smallBlindPosition, 'SB');
  labels.set(bigBlindPosition, 'BB');

  if (playerCount === 3) return labels;

  // For 4+ players, assign remaining positions clockwise from BB
  // The positions after BB going clockwise are: UTG, UTG+1, MP, MP+1, HJ, CO
  const remainingPositions: PositionLabel[] = getMiddlePositions(playerCount);

  let currentIndex = (bigBlindPosition + 1) % playerCount;
  for (const posLabel of remainingPositions) {
    // Skip positions already assigned (BTN, SB, BB)
    if (currentIndex === dealerPosition || currentIndex === smallBlindPosition || currentIndex === bigBlindPosition) {
      currentIndex = (currentIndex + 1) % playerCount;
    }
    if (labels.has(currentIndex)) {
      currentIndex = (currentIndex + 1) % playerCount;
    }
    labels.set(currentIndex, posLabel);
    currentIndex = (currentIndex + 1) % playerCount;
  }

  return labels;
}

/**
 * Get the middle position labels for a given player count (excluding BTN, SB, BB).
 */
function getMiddlePositions(playerCount: number): PositionLabel[] {
  switch (playerCount) {
    case 4: return ['UTG'];
    case 5: return ['UTG', 'CO'];
    case 6: return ['UTG', 'HJ', 'CO'];
    case 7: return ['UTG', 'UTG+1', 'HJ', 'CO'];
    case 8: return ['UTG', 'UTG+1', 'MP', 'HJ', 'CO'];
    case 9: return ['UTG', 'UTG+1', 'MP', 'MP+1', 'HJ', 'CO'];
    default: return [];
  }
}
