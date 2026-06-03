import { describe, it, expect } from 'vitest';
import { Card } from '@spin-and-go/shared';
import {
  getRankValue,
  isFlush,
  isStraight,
  getGroupings,
  evaluateFiveCards,
  evaluateHand,
  compareHands,
  determineWinners,
} from './handEvaluator';

// ============================================================
// Helper card factory
// ============================================================
function card(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

// ============================================================
// getRankValue tests
// ============================================================
describe('getRankValue', () => {
  it('returns 2 for "2"', () => {
    expect(getRankValue('2')).toBe(2);
  });

  it('returns 10 for "10"', () => {
    expect(getRankValue('10')).toBe(10);
  });

  it('returns 11 for "J"', () => {
    expect(getRankValue('J')).toBe(11);
  });

  it('returns 12 for "Q"', () => {
    expect(getRankValue('Q')).toBe(12);
  });

  it('returns 13 for "K"', () => {
    expect(getRankValue('K')).toBe(13);
  });

  it('returns 14 for "A"', () => {
    expect(getRankValue('A')).toBe(14);
  });
});

// ============================================================
// isFlush tests
// ============================================================
describe('isFlush', () => {
  it('returns true when all cards are the same suit', () => {
    const cards: Card[] = [
      card('2', 'hearts'), card('5', 'hearts'), card('8', 'hearts'),
      card('J', 'hearts'), card('A', 'hearts'),
    ];
    expect(isFlush(cards)).toBe(true);
  });

  it('returns false when cards have mixed suits', () => {
    const cards: Card[] = [
      card('2', 'hearts'), card('5', 'diamonds'), card('8', 'hearts'),
      card('J', 'hearts'), card('A', 'hearts'),
    ];
    expect(isFlush(cards)).toBe(false);
  });
});

// ============================================================
// isStraight tests
// ============================================================
describe('isStraight', () => {
  it('returns true for consecutive cards', () => {
    const cards: Card[] = [
      card('5', 'hearts'), card('6', 'diamonds'), card('7', 'clubs'),
      card('8', 'spades'), card('9', 'hearts'),
    ];
    expect(isStraight(cards)).toBe(true);
  });

  it('returns true for A-2-3-4-5 wheel', () => {
    const cards: Card[] = [
      card('A', 'hearts'), card('2', 'diamonds'), card('3', 'clubs'),
      card('4', 'spades'), card('5', 'hearts'),
    ];
    expect(isStraight(cards)).toBe(true);
  });

  it('returns true for 10-J-Q-K-A', () => {
    const cards: Card[] = [
      card('10', 'hearts'), card('J', 'diamonds'), card('Q', 'clubs'),
      card('K', 'spades'), card('A', 'hearts'),
    ];
    expect(isStraight(cards)).toBe(true);
  });

  it('returns false for non-consecutive cards', () => {
    const cards: Card[] = [
      card('2', 'hearts'), card('4', 'diamonds'), card('6', 'clubs'),
      card('8', 'spades'), card('10', 'hearts'),
    ];
    expect(isStraight(cards)).toBe(false);
  });

  it('returns false for Q-K-A-2-3 wrap-around (not valid)', () => {
    const cards: Card[] = [
      card('Q', 'hearts'), card('K', 'diamonds'), card('A', 'clubs'),
      card('2', 'spades'), card('3', 'hearts'),
    ];
    expect(isStraight(cards)).toBe(false);
  });
});

// ============================================================
// getGroupings tests
// ============================================================
describe('getGroupings', () => {
  it('groups cards by rank value', () => {
    const cards: Card[] = [
      card('K', 'hearts'), card('K', 'diamonds'), card('5', 'clubs'),
      card('5', 'spades'), card('5', 'hearts'),
    ];
    const groups = getGroupings(cards);
    expect(groups.get(13)!.length).toBe(2); // Two Kings
    expect(groups.get(5)!.length).toBe(3);  // Three 5s
  });
});

// ============================================================
// evaluateFiveCards tests
// ============================================================
describe('evaluateFiveCards', () => {
  it('identifies Royal Flush (rank 1)', () => {
    const cards: Card[] = [
      card('10', 'spades'), card('J', 'spades'), card('Q', 'spades'),
      card('K', 'spades'), card('A', 'spades'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(1);
    expect(result.name).toBe('Royal Flush');
  });

  it('identifies Straight Flush (rank 2)', () => {
    const cards: Card[] = [
      card('5', 'hearts'), card('6', 'hearts'), card('7', 'hearts'),
      card('8', 'hearts'), card('9', 'hearts'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(2);
    expect(result.name).toBe('Straight Flush');
  });

  it('identifies A-2-3-4-5 Straight Flush (wheel)', () => {
    const cards: Card[] = [
      card('A', 'clubs'), card('2', 'clubs'), card('3', 'clubs'),
      card('4', 'clubs'), card('5', 'clubs'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(2);
    expect(result.name).toBe('Straight Flush');
  });

  it('identifies Four of a Kind (rank 3)', () => {
    const cards: Card[] = [
      card('9', 'hearts'), card('9', 'diamonds'), card('9', 'clubs'),
      card('9', 'spades'), card('K', 'hearts'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(3);
    expect(result.name).toBe('Four of a Kind');
  });

  it('identifies Full House (rank 4)', () => {
    const cards: Card[] = [
      card('J', 'hearts'), card('J', 'diamonds'), card('J', 'clubs'),
      card('4', 'spades'), card('4', 'hearts'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(4);
    expect(result.name).toBe('Full House');
  });

  it('identifies Flush (rank 5)', () => {
    const cards: Card[] = [
      card('2', 'diamonds'), card('5', 'diamonds'), card('8', 'diamonds'),
      card('J', 'diamonds'), card('A', 'diamonds'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(5);
    expect(result.name).toBe('Flush');
  });

  it('identifies Straight (rank 6)', () => {
    const cards: Card[] = [
      card('4', 'hearts'), card('5', 'diamonds'), card('6', 'clubs'),
      card('7', 'spades'), card('8', 'hearts'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(6);
    expect(result.name).toBe('Straight');
  });

  it('identifies A-2-3-4-5 Straight (wheel)', () => {
    const cards: Card[] = [
      card('A', 'hearts'), card('2', 'diamonds'), card('3', 'clubs'),
      card('4', 'spades'), card('5', 'hearts'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(6);
    expect(result.name).toBe('Straight');
  });

  it('identifies Three of a Kind (rank 7)', () => {
    const cards: Card[] = [
      card('7', 'hearts'), card('7', 'diamonds'), card('7', 'clubs'),
      card('2', 'spades'), card('K', 'hearts'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(7);
    expect(result.name).toBe('Three of a Kind');
  });

  it('identifies Two Pair (rank 8)', () => {
    const cards: Card[] = [
      card('Q', 'hearts'), card('Q', 'diamonds'), card('6', 'clubs'),
      card('6', 'spades'), card('A', 'hearts'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(8);
    expect(result.name).toBe('Two Pair');
  });

  it('identifies One Pair (rank 9)', () => {
    const cards: Card[] = [
      card('10', 'hearts'), card('10', 'diamonds'), card('3', 'clubs'),
      card('7', 'spades'), card('A', 'hearts'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(9);
    expect(result.name).toBe('One Pair');
  });

  it('identifies High Card (rank 10)', () => {
    const cards: Card[] = [
      card('2', 'hearts'), card('5', 'diamonds'), card('8', 'clubs'),
      card('J', 'spades'), card('A', 'hearts'),
    ];
    const result = evaluateFiveCards(cards);
    expect(result.rank).toBe(10);
    expect(result.name).toBe('High Card');
  });

  it('throws error for non-5-card input', () => {
    const cards: Card[] = [card('2', 'hearts'), card('3', 'hearts')];
    expect(() => evaluateFiveCards(cards)).toThrow();
  });
});

// ============================================================
// evaluateHand (7 cards → best 5) tests
// ============================================================
describe('evaluateHand', () => {
  it('finds the best hand from 7 cards', () => {
    // Hole cards: A♠ K♠, Community: Q♠ J♠ 10♠ 3♥ 7♦
    // Best hand: Royal Flush (A-K-Q-J-10 of spades)
    const cards: Card[] = [
      card('A', 'spades'), card('K', 'spades'),
      card('Q', 'spades'), card('J', 'spades'), card('10', 'spades'),
      card('3', 'hearts'), card('7', 'diamonds'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(1);
    expect(result.name).toBe('Royal Flush');
  });

  it('finds full house from 7 cards with multiple pairs', () => {
    // Cards: K K K 5 5 2 8
    const cards: Card[] = [
      card('K', 'hearts'), card('K', 'diamonds'),
      card('K', 'clubs'), card('5', 'spades'), card('5', 'hearts'),
      card('2', 'diamonds'), card('8', 'clubs'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(4);
    expect(result.name).toBe('Full House');
  });

  it('finds flush from 7 cards', () => {
    // 5 hearts + 2 non-hearts
    const cards: Card[] = [
      card('2', 'hearts'), card('6', 'hearts'),
      card('9', 'hearts'), card('J', 'hearts'), card('A', 'hearts'),
      card('3', 'diamonds'), card('K', 'clubs'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(5);
    expect(result.name).toBe('Flush');
  });

  it('finds straight from 7 cards', () => {
    const cards: Card[] = [
      card('4', 'hearts'), card('5', 'diamonds'),
      card('6', 'clubs'), card('7', 'spades'), card('8', 'hearts'),
      card('K', 'diamonds'), card('2', 'clubs'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(6);
    expect(result.name).toBe('Straight');
  });

  it('works with exactly 5 cards', () => {
    const cards: Card[] = [
      card('A', 'hearts'), card('K', 'hearts'), card('Q', 'hearts'),
      card('J', 'hearts'), card('10', 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(1);
    expect(result.name).toBe('Royal Flush');
  });
});

// ============================================================
// compareHands tests
// ============================================================
describe('compareHands', () => {
  it('Royal Flush beats Straight Flush', () => {
    const royalFlush = evaluateFiveCards([
      card('10', 'spades'), card('J', 'spades'), card('Q', 'spades'),
      card('K', 'spades'), card('A', 'spades'),
    ]);
    const straightFlush = evaluateFiveCards([
      card('5', 'hearts'), card('6', 'hearts'), card('7', 'hearts'),
      card('8', 'hearts'), card('9', 'hearts'),
    ]);
    expect(compareHands(royalFlush, straightFlush)).toBeLessThan(0);
  });

  it('Straight Flush beats Four of a Kind', () => {
    const straightFlush = evaluateFiveCards([
      card('5', 'hearts'), card('6', 'hearts'), card('7', 'hearts'),
      card('8', 'hearts'), card('9', 'hearts'),
    ]);
    const fourKind = evaluateFiveCards([
      card('A', 'hearts'), card('A', 'diamonds'), card('A', 'clubs'),
      card('A', 'spades'), card('K', 'hearts'),
    ]);
    expect(compareHands(straightFlush, fourKind)).toBeLessThan(0);
  });

  it('Four of a Kind beats Full House', () => {
    const fourKind = evaluateFiveCards([
      card('9', 'hearts'), card('9', 'diamonds'), card('9', 'clubs'),
      card('9', 'spades'), card('K', 'hearts'),
    ]);
    const fullHouse = evaluateFiveCards([
      card('A', 'hearts'), card('A', 'diamonds'), card('A', 'clubs'),
      card('K', 'spades'), card('K', 'diamonds'),
    ]);
    expect(compareHands(fourKind, fullHouse)).toBeLessThan(0);
  });

  it('Full House beats Flush', () => {
    const fullHouse = evaluateFiveCards([
      card('J', 'hearts'), card('J', 'diamonds'), card('J', 'clubs'),
      card('4', 'spades'), card('4', 'hearts'),
    ]);
    const flush = evaluateFiveCards([
      card('2', 'diamonds'), card('5', 'diamonds'), card('8', 'diamonds'),
      card('J', 'diamonds'), card('A', 'diamonds'),
    ]);
    expect(compareHands(fullHouse, flush)).toBeLessThan(0);
  });

  it('Flush beats Straight', () => {
    const flush = evaluateFiveCards([
      card('2', 'diamonds'), card('5', 'diamonds'), card('8', 'diamonds'),
      card('J', 'diamonds'), card('A', 'diamonds'),
    ]);
    const straight = evaluateFiveCards([
      card('4', 'hearts'), card('5', 'diamonds'), card('6', 'clubs'),
      card('7', 'spades'), card('8', 'hearts'),
    ]);
    expect(compareHands(flush, straight)).toBeLessThan(0);
  });

  it('Straight beats Three of a Kind', () => {
    const straight = evaluateFiveCards([
      card('4', 'hearts'), card('5', 'diamonds'), card('6', 'clubs'),
      card('7', 'spades'), card('8', 'hearts'),
    ]);
    const threeKind = evaluateFiveCards([
      card('A', 'hearts'), card('A', 'diamonds'), card('A', 'clubs'),
      card('K', 'spades'), card('Q', 'hearts'),
    ]);
    expect(compareHands(straight, threeKind)).toBeLessThan(0);
  });

  it('Three of a Kind beats Two Pair', () => {
    const threeKind = evaluateFiveCards([
      card('7', 'hearts'), card('7', 'diamonds'), card('7', 'clubs'),
      card('2', 'spades'), card('K', 'hearts'),
    ]);
    const twoPair = evaluateFiveCards([
      card('A', 'hearts'), card('A', 'diamonds'), card('K', 'clubs'),
      card('K', 'spades'), card('Q', 'hearts'),
    ]);
    expect(compareHands(threeKind, twoPair)).toBeLessThan(0);
  });

  it('Two Pair beats One Pair', () => {
    const twoPair = evaluateFiveCards([
      card('Q', 'hearts'), card('Q', 'diamonds'), card('6', 'clubs'),
      card('6', 'spades'), card('A', 'hearts'),
    ]);
    const onePair = evaluateFiveCards([
      card('A', 'hearts'), card('A', 'diamonds'), card('K', 'clubs'),
      card('Q', 'spades'), card('J', 'hearts'),
    ]);
    expect(compareHands(twoPair, onePair)).toBeLessThan(0);
  });

  it('One Pair beats High Card', () => {
    const onePair = evaluateFiveCards([
      card('2', 'hearts'), card('2', 'diamonds'), card('3', 'clubs'),
      card('4', 'spades'), card('5', 'hearts'),
    ]);
    const highCard = evaluateFiveCards([
      card('A', 'hearts'), card('K', 'diamonds'), card('Q', 'clubs'),
      card('J', 'spades'), card('9', 'hearts'),
    ]);
    expect(compareHands(onePair, highCard)).toBeLessThan(0);
  });

  // Kicker comparison tests
  it('higher kicker wins with same pair', () => {
    const pairWithAceKicker = evaluateFiveCards([
      card('10', 'hearts'), card('10', 'diamonds'), card('A', 'clubs'),
      card('5', 'spades'), card('3', 'hearts'),
    ]);
    const pairWithKingKicker = evaluateFiveCards([
      card('10', 'clubs'), card('10', 'spades'), card('K', 'hearts'),
      card('5', 'diamonds'), card('3', 'clubs'),
    ]);
    expect(compareHands(pairWithAceKicker, pairWithKingKicker)).toBeLessThan(0);
  });

  it('higher straight beats lower straight', () => {
    const highStraight = evaluateFiveCards([
      card('6', 'hearts'), card('7', 'diamonds'), card('8', 'clubs'),
      card('9', 'spades'), card('10', 'hearts'),
    ]);
    const lowStraight = evaluateFiveCards([
      card('4', 'hearts'), card('5', 'diamonds'), card('6', 'clubs'),
      card('7', 'spades'), card('8', 'hearts'),
    ]);
    expect(compareHands(highStraight, lowStraight)).toBeLessThan(0);
  });

  it('wheel (A-5) loses to 6-high straight', () => {
    const wheel = evaluateFiveCards([
      card('A', 'hearts'), card('2', 'diamonds'), card('3', 'clubs'),
      card('4', 'spades'), card('5', 'hearts'),
    ]);
    const sixHigh = evaluateFiveCards([
      card('2', 'clubs'), card('3', 'hearts'), card('4', 'diamonds'),
      card('5', 'spades'), card('6', 'clubs'),
    ]);
    expect(compareHands(wheel, sixHigh)).toBeGreaterThan(0);
  });

  it('identical hands result in tie (0)', () => {
    const hand1 = evaluateFiveCards([
      card('A', 'hearts'), card('K', 'hearts'), card('Q', 'hearts'),
      card('J', 'hearts'), card('9', 'hearts'),
    ]);
    const hand2 = evaluateFiveCards([
      card('A', 'diamonds'), card('K', 'diamonds'), card('Q', 'diamonds'),
      card('J', 'diamonds'), card('9', 'diamonds'),
    ]);
    expect(compareHands(hand1, hand2)).toBe(0);
  });

  it('higher flush beats lower flush', () => {
    const highFlush = evaluateFiveCards([
      card('A', 'hearts'), card('K', 'hearts'), card('Q', 'hearts'),
      card('J', 'hearts'), card('9', 'hearts'),
    ]);
    const lowFlush = evaluateFiveCards([
      card('A', 'diamonds'), card('K', 'diamonds'), card('Q', 'diamonds'),
      card('J', 'diamonds'), card('8', 'diamonds'),
    ]);
    expect(compareHands(highFlush, lowFlush)).toBeLessThan(0);
  });

  it('higher full house (trips) beats lower full house', () => {
    const highFH = evaluateFiveCards([
      card('K', 'hearts'), card('K', 'diamonds'), card('K', 'clubs'),
      card('2', 'spades'), card('2', 'hearts'),
    ]);
    const lowFH = evaluateFiveCards([
      card('Q', 'hearts'), card('Q', 'diamonds'), card('Q', 'clubs'),
      card('A', 'spades'), card('A', 'hearts'),
    ]);
    expect(compareHands(highFH, lowFH)).toBeLessThan(0);
  });

  it('higher four of a kind beats lower four of a kind', () => {
    const highQuads = evaluateFiveCards([
      card('A', 'hearts'), card('A', 'diamonds'), card('A', 'clubs'),
      card('A', 'spades'), card('2', 'hearts'),
    ]);
    const lowQuads = evaluateFiveCards([
      card('K', 'hearts'), card('K', 'diamonds'), card('K', 'clubs'),
      card('K', 'spades'), card('A', 'hearts'),
    ]);
    expect(compareHands(highQuads, lowQuads)).toBeLessThan(0);
  });
});

// ============================================================
// determineWinners tests
// ============================================================
describe('determineWinners', () => {
  it('returns single winner with best hand', () => {
    const players = [
      { playerId: 'p1', holeCards: [card('A', 'spades'), card('K', 'spades')] },
      { playerId: 'p2', holeCards: [card('2', 'hearts'), card('7', 'diamonds')] },
      { playerId: 'p3', holeCards: [card('3', 'clubs'), card('8', 'clubs')] },
    ];
    const community: Card[] = [
      card('Q', 'spades'), card('J', 'spades'), card('10', 'spades'),
      card('4', 'hearts'), card('9', 'diamonds'),
    ];

    const result = determineWinners(players, community);
    expect(result.winnerIds).toEqual(['p1']);
    expect(result.handRanking.rank).toBe(1); // Royal Flush
  });

  it('returns multiple winners on tie (pot split)', () => {
    // Both players have the same straight from community cards
    const players = [
      { playerId: 'p1', holeCards: [card('2', 'hearts'), card('3', 'hearts')] },
      { playerId: 'p2', holeCards: [card('2', 'diamonds'), card('3', 'diamonds')] },
    ];
    const community: Card[] = [
      card('6', 'clubs'), card('7', 'spades'), card('8', 'hearts'),
      card('9', 'diamonds'), card('10', 'clubs'),
    ];

    const result = determineWinners(players, community);
    expect(result.winnerIds).toHaveLength(2);
    expect(result.winnerIds).toContain('p1');
    expect(result.winnerIds).toContain('p2');
    expect(result.handRanking.rank).toBe(6); // Straight
  });

  it('correctly picks winner between flush and straight', () => {
    const players = [
      { playerId: 'p1', holeCards: [card('A', 'hearts'), card('K', 'hearts')] },
      { playerId: 'p2', holeCards: [card('9', 'clubs'), card('8', 'clubs')] },
    ];
    const community: Card[] = [
      card('2', 'hearts'), card('5', 'hearts'), card('7', 'hearts'),
      card('6', 'clubs'), card('10', 'diamonds'),
    ];

    const result = determineWinners(players, community);
    expect(result.winnerIds).toEqual(['p1']); // Flush beats straight
    expect(result.handRanking.rank).toBe(5); // Flush
  });

  it('handles 3 players with one clear winner', () => {
    const players = [
      { playerId: 'p1', holeCards: [card('A', 'hearts'), card('A', 'diamonds')] },
      { playerId: 'p2', holeCards: [card('K', 'hearts'), card('K', 'diamonds')] },
      { playerId: 'p3', holeCards: [card('Q', 'hearts'), card('Q', 'diamonds')] },
    ];
    const community: Card[] = [
      card('A', 'clubs'), card('K', 'clubs'), card('Q', 'clubs'),
      card('2', 'spades'), card('7', 'spades'),
    ];

    const result = determineWinners(players, community);
    expect(result.winnerIds).toEqual(['p1']); // Three Aces
    expect(result.handRanking.rank).toBe(7); // Three of a Kind
  });

  it('throws error with no players', () => {
    expect(() => determineWinners([], [
      card('2', 'hearts'), card('3', 'hearts'), card('4', 'hearts'),
      card('5', 'hearts'), card('6', 'hearts'),
    ])).toThrow();
  });

  it('works with 3 community cards (flop)', () => {
    const players = [
      { playerId: 'p1', holeCards: [card('A', 'spades'), card('A', 'hearts')] },
      { playerId: 'p2', holeCards: [card('K', 'spades'), card('K', 'hearts')] },
    ];
    const community: Card[] = [
      card('2', 'clubs'), card('7', 'diamonds'), card('9', 'spades'),
    ];

    const result = determineWinners(players, community);
    expect(result.winnerIds).toEqual(['p1']); // Pair of Aces > Pair of Kings
  });
});
