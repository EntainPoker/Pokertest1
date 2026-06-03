import { Card, HandRanking } from '@spin-and-go/shared';

// ============================================================
// Helper Functions
// ============================================================

/** Convert card rank string to numeric value. '2'=2, ..., 'A'=14 */
export function getRankValue(rank: Card['rank']): number {
  const values: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  };
  return values[rank];
}

/** Check if all 5 cards share the same suit */
export function isFlush(cards: Card[]): boolean {
  return cards.every(c => c.suit === cards[0].suit);
}

/** Check if 5 cards form a straight (handles A-2-3-4-5 wheel) */
export function isStraight(cards: Card[]): boolean {
  const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => a - b);

  // Normal straight: consecutive values
  const isNormal = values.every((v, i) => i === 0 || v === values[i - 1] + 1);
  if (isNormal) return true;

  // Wheel: A-2-3-4-5 (values sorted would be [2, 3, 4, 5, 14])
  const isWheel =
    values[0] === 2 &&
    values[1] === 3 &&
    values[2] === 4 &&
    values[3] === 5 &&
    values[4] === 14;

  return isWheel;
}

/** Group cards by their rank value. Returns Map<rankValue, Card[]> */
export function getGroupings(cards: Card[]): Map<number, Card[]> {
  const groups = new Map<number, Card[]>();
  for (const card of cards) {
    const value = getRankValue(card.rank);
    if (!groups.has(value)) {
      groups.set(value, []);
    }
    groups.get(value)!.push(card);
  }
  return groups;
}

/**
 * Get the high card value for a straight.
 * For the wheel (A-2-3-4-5), the high card is 5, not Ace.
 */
function getStraightHighCard(cards: Card[]): number {
  const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => a - b);
  // Wheel case
  if (values[4] === 14 && values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5) {
    return 5;
  }
  return values[4];
}

/**
 * Sort cards by rank value descending (for kicker comparison).
 * For straights, the wheel is handled specially.
 */
function sortByRankDesc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
}

// ============================================================
// Five-Card Hand Evaluation
// ============================================================

/**
 * Evaluate exactly 5 cards and return the HandRanking.
 * Checks in order from best to worst:
 * 1=Royal Flush, 2=Straight Flush, 3=Four of a Kind, 4=Full House,
 * 5=Flush, 6=Straight, 7=Three of a Kind, 8=Two Pair, 9=One Pair, 10=High Card
 */
export function evaluateFiveCards(cards: Card[]): HandRanking {
  if (cards.length !== 5) {
    throw new Error(`evaluateFiveCards requires exactly 5 cards, got ${cards.length}`);
  }

  const flush = isFlush(cards);
  const straight = isStraight(cards);
  const groups = getGroupings(cards);
  const groupSizes = [...groups.values()].map(g => g.length).sort((a, b) => b - a);

  // Royal Flush: A-K-Q-J-10 all same suit
  if (flush && straight) {
    const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => a - b);
    if (values[0] === 10 && values[4] === 14) {
      return { rank: 1, name: 'Royal Flush', cards: sortByRankDesc(cards) };
    }
    // Straight Flush
    return { rank: 2, name: 'Straight Flush', cards: sortByRankDesc(cards) };
  }

  // Four of a Kind
  if (groupSizes[0] === 4) {
    const fourKind = [...groups.entries()].find(([, g]) => g.length === 4)!;
    const kicker = [...groups.entries()].find(([, g]) => g.length !== 4)!;
    return { rank: 3, name: 'Four of a Kind', cards: [...fourKind[1], ...kicker[1]] };
  }

  // Full House: three of a kind + pair
  if (groupSizes[0] === 3 && groupSizes[1] === 2) {
    const threeKind = [...groups.entries()].find(([, g]) => g.length === 3)!;
    const pair = [...groups.entries()].find(([, g]) => g.length === 2)!;
    return { rank: 4, name: 'Full House', cards: [...threeKind[1], ...pair[1]] };
  }

  // Flush
  if (flush) {
    return { rank: 5, name: 'Flush', cards: sortByRankDesc(cards) };
  }

  // Straight
  if (straight) {
    return { rank: 6, name: 'Straight', cards: sortByRankDesc(cards) };
  }

  // Three of a Kind
  if (groupSizes[0] === 3) {
    const threeKind = [...groups.entries()].find(([, g]) => g.length === 3)!;
    const kickers = [...groups.entries()]
      .filter(([, g]) => g.length !== 3)
      .flatMap(([, g]) => g)
      .sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
    return { rank: 7, name: 'Three of a Kind', cards: [...threeKind[1], ...kickers] };
  }

  // Two Pair
  if (groupSizes[0] === 2 && groupSizes[1] === 2) {
    const pairs = [...groups.entries()]
      .filter(([, g]) => g.length === 2)
      .sort((a, b) => b[0] - a[0]);
    const kicker = [...groups.entries()].find(([, g]) => g.length === 1)!;
    return { rank: 8, name: 'Two Pair', cards: [...pairs[0][1], ...pairs[1][1], ...kicker[1]] };
  }

  // One Pair
  if (groupSizes[0] === 2) {
    const pair = [...groups.entries()].find(([, g]) => g.length === 2)!;
    const kickers = [...groups.entries()]
      .filter(([, g]) => g.length !== 2)
      .flatMap(([, g]) => g)
      .sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
    return { rank: 9, name: 'One Pair', cards: [...pair[1], ...kickers] };
  }

  // High Card
  return { rank: 10, name: 'High Card', cards: sortByRankDesc(cards) };
}

// ============================================================
// Seven-Card Hand Evaluation (Best 5 from 7)
// ============================================================

/**
 * Generate all C(n, k) combinations of elements from an array.
 */
function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];

  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

/**
 * Evaluate the best 5-card hand from 7 cards (2 hole + 5 community).
 * Generates all C(7,5) = 21 combinations and returns the highest ranking.
 */
export function evaluateHand(cards: Card[]): HandRanking {
  if (cards.length < 5) {
    throw new Error(`evaluateHand requires at least 5 cards, got ${cards.length}`);
  }

  if (cards.length === 5) {
    return evaluateFiveCards(cards);
  }

  const allCombinations = combinations(cards, 5);
  let bestHand: HandRanking | null = null;

  for (const combo of allCombinations) {
    const ranking = evaluateFiveCards(combo);
    if (!bestHand || compareHands(ranking, bestHand) < 0) {
      bestHand = ranking;
    }
  }

  return bestHand!;
}

// ============================================================
// Hand Comparison
// ============================================================

/**
 * Get kicker values for hand comparison.
 * Returns an array of numeric values used to break ties within the same hand rank.
 */
function getKickerValues(hand: HandRanking): number[] {
  const cards = hand.cards;
  const groups = getGroupings(cards);

  switch (hand.rank) {
    case 1: // Royal Flush — all the same
      return [14];
    case 2: { // Straight Flush — compare by high card
      return [getStraightHighCard(cards)];
    }
    case 3: { // Four of a Kind — quad rank, then kicker
      const fourKind = [...groups.entries()].find(([, g]) => g.length === 4)!;
      const kicker = [...groups.entries()].find(([, g]) => g.length !== 4)!;
      return [fourKind[0], kicker[0]];
    }
    case 4: { // Full House — trips rank, then pair rank
      const threeKind = [...groups.entries()].find(([, g]) => g.length === 3)!;
      const pair = [...groups.entries()].find(([, g]) => g.length === 2)!;
      return [threeKind[0], pair[0]];
    }
    case 5: { // Flush — compare all 5 cards high to low
      return cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
    }
    case 6: { // Straight — compare by high card
      return [getStraightHighCard(cards)];
    }
    case 7: { // Three of a Kind — trips rank, then kickers
      const threeKind = [...groups.entries()].find(([, g]) => g.length === 3)!;
      const kickers = [...groups.entries()]
        .filter(([, g]) => g.length !== 3)
        .map(([v]) => v)
        .sort((a, b) => b - a);
      return [threeKind[0], ...kickers];
    }
    case 8: { // Two Pair — high pair, low pair, kicker
      const pairs = [...groups.entries()]
        .filter(([, g]) => g.length === 2)
        .map(([v]) => v)
        .sort((a, b) => b - a);
      const kicker = [...groups.entries()].find(([, g]) => g.length === 1)!;
      return [...pairs, kicker[0]];
    }
    case 9: { // One Pair — pair rank, then kickers
      const pair = [...groups.entries()].find(([, g]) => g.length === 2)!;
      const kickers = [...groups.entries()]
        .filter(([, g]) => g.length !== 2)
        .map(([v]) => v)
        .sort((a, b) => b - a);
      return [pair[0], ...kickers];
    }
    case 10: { // High Card — all 5 cards high to low
      return cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
    }
    default:
      return [];
  }
}

/**
 * Compare two hand rankings.
 * Returns negative if hand1 wins, positive if hand2 wins, 0 if tie.
 * Lower rank number = better hand (1 beats 2, etc.)
 */
export function compareHands(hand1: HandRanking, hand2: HandRanking): number {
  // Lower rank number is better
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }

  // Same rank — compare kickers
  const kickers1 = getKickerValues(hand1);
  const kickers2 = getKickerValues(hand2);

  for (let i = 0; i < Math.max(kickers1.length, kickers2.length); i++) {
    const k1 = kickers1[i] ?? 0;
    const k2 = kickers2[i] ?? 0;
    if (k1 !== k2) {
      return k2 - k1; // Higher kicker wins (negative means hand1 wins)
    }
  }

  return 0; // Tie
}

// ============================================================
// Winner Determination
// ============================================================

export interface PlayerHandInput {
  playerId: string;
  holeCards: Card[];
}

export interface WinnerResult {
  winnerIds: string[];
  handRanking: HandRanking;
}

/**
 * Determine the winner(s) from a set of players and community cards.
 * Returns the winner ID(s) and the winning hand ranking.
 * Multiple winners indicates a tie (pot split).
 */
export function determineWinners(
  players: PlayerHandInput[],
  communityCards: Card[]
): WinnerResult {
  if (players.length === 0) {
    throw new Error('At least one player is required');
  }
  if (communityCards.length < 3 || communityCards.length > 5) {
    throw new Error(`Community cards must be 3-5, got ${communityCards.length}`);
  }

  const evaluations = players.map(player => ({
    playerId: player.playerId,
    hand: evaluateHand([...player.holeCards, ...communityCards]),
  }));

  // Sort by hand strength (best first)
  evaluations.sort((a, b) => compareHands(a.hand, b.hand));

  // Find all players tied with the best hand
  const bestHand = evaluations[0].hand;
  const winnerIds = evaluations
    .filter(e => compareHands(e.hand, bestHand) === 0)
    .map(e => e.playerId);

  return {
    winnerIds,
    handRanking: bestHand,
  };
}
