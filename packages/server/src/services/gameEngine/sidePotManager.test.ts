import { describe, it, expect } from 'vitest';
import { calculateSidePots, PotPlayer } from './sidePotManager.js';

describe('calculateSidePots', () => {
  describe('no all-in scenarios', () => {
    it('should return a single pot when no player is all-in', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 100, status: 'active' },
        { playerId: 'B', totalBetThisHand: 100, status: 'active' },
        { playerId: 'C', totalBetThisHand: 100, status: 'active' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(300);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    });

    it('should return empty array when no contributions', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 0, status: 'active' },
        { playerId: 'B', totalBetThisHand: 0, status: 'active' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(0);
    });

    it('should return empty array for empty player list', () => {
      const pots = calculateSidePots([]);
      expect(pots).toHaveLength(0);
    });

    it('should exclude folded players from eligibility but include their contributions', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 50, status: 'active' },
        { playerId: 'B', totalBetThisHand: 50, status: 'active' },
        { playerId: 'C', totalBetThisHand: 20, status: 'folded' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(120);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B']));
      expect(pots[0].eligiblePlayerIds).not.toContain('C');
    });
  });

  describe('single all-in scenario', () => {
    it('should create main pot and side pot when one player goes all-in', () => {
      // Player A bets 100 (all-in), Player B bets 200 (active), Player C bets 200 (active)
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 100, status: 'all_in' },
        { playerId: 'B', totalBetThisHand: 200, status: 'active' },
        { playerId: 'C', totalBetThisHand: 200, status: 'active' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(2);

      // Main pot: 100 × 3 = 300, eligible: A, B, C
      expect(pots[0].amount).toBe(300);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B', 'C']));

      // Side pot: 100 × 2 = 200, eligible: B, C
      expect(pots[1].amount).toBe(200);
      expect(pots[1].eligiblePlayerIds).toEqual(expect.arrayContaining(['B', 'C']));
      expect(pots[1].eligiblePlayerIds).not.toContain('A');
    });

    it('should not include all-in player in side pot eligibility', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 50, status: 'all_in' },
        { playerId: 'B', totalBetThisHand: 150, status: 'active' },
        { playerId: 'C', totalBetThisHand: 150, status: 'active' },
      ];

      const pots = calculateSidePots(players);

      // Main pot: 50 × 3 = 150
      expect(pots[0].amount).toBe(150);
      expect(pots[0].eligiblePlayerIds).toContain('A');

      // Side pot: 100 × 2 = 200
      expect(pots[1].amount).toBe(200);
      expect(pots[1].eligiblePlayerIds).not.toContain('A');
    });
  });

  describe('multiple all-in scenarios', () => {
    it('should create cascading side pots with multiple all-ins at different levels', () => {
      // Player A: 50 (all-in), Player B: 150 (all-in), Player C: 300 (active)
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 50, status: 'all_in' },
        { playerId: 'B', totalBetThisHand: 150, status: 'all_in' },
        { playerId: 'C', totalBetThisHand: 300, status: 'active' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(3);

      // Main pot: 50 × 3 = 150, eligible: A, B, C
      expect(pots[0].amount).toBe(150);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B', 'C']));

      // Side pot 1: 100 × 2 = 200, eligible: B, C
      expect(pots[1].amount).toBe(200);
      expect(pots[1].eligiblePlayerIds).toEqual(expect.arrayContaining(['B', 'C']));
      expect(pots[1].eligiblePlayerIds).not.toContain('A');

      // Side pot 2: 150 × 1 = 150, eligible: C
      expect(pots[2].amount).toBe(150);
      expect(pots[2].eligiblePlayerIds).toEqual(['C']);
    });

    it('should handle two players all-in at the same level', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 100, status: 'all_in' },
        { playerId: 'B', totalBetThisHand: 100, status: 'all_in' },
        { playerId: 'C', totalBetThisHand: 200, status: 'active' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(2);

      // Main pot: 100 × 3 = 300, eligible: A, B, C
      expect(pots[0].amount).toBe(300);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B', 'C']));

      // Side pot: 100 × 1 = 100, eligible: C
      expect(pots[1].amount).toBe(100);
      expect(pots[1].eligiblePlayerIds).toEqual(['C']);
    });

    it('should handle all three players all-in at different levels', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 50, status: 'all_in' },
        { playerId: 'B', totalBetThisHand: 100, status: 'all_in' },
        { playerId: 'C', totalBetThisHand: 200, status: 'all_in' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(3);

      // Main pot: 50 × 3 = 150, eligible: A, B, C
      expect(pots[0].amount).toBe(150);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B', 'C']));

      // Side pot 1: 50 × 2 = 100, eligible: B, C
      expect(pots[1].amount).toBe(100);
      expect(pots[1].eligiblePlayerIds).toEqual(expect.arrayContaining(['B', 'C']));
      expect(pots[1].eligiblePlayerIds).not.toContain('A');

      // Side pot 2: 100 × 1 = 100, eligible: C
      expect(pots[2].amount).toBe(100);
      expect(pots[2].eligiblePlayerIds).toEqual(['C']);
    });
  });

  describe('folded players with all-in', () => {
    it('should include folded player contributions but not eligibility', () => {
      // Player A folds after betting 30, Player B all-in 100, Player C active 200
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 30, status: 'folded' },
        { playerId: 'B', totalBetThisHand: 100, status: 'all_in' },
        { playerId: 'C', totalBetThisHand: 200, status: 'active' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(2);

      // Main pot: A contributes 30, B contributes 100, C contributes 100 = 230
      // Wait - the logic is: at level 100, each contributes min(their bet, 100)
      // A: min(30, 100) = 30, B: min(100, 100) = 100, C: min(200, 100) = 100
      // Total main pot = 230, eligible: B, C (A is folded)
      expect(pots[0].amount).toBe(230);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['B', 'C']));
      expect(pots[0].eligiblePlayerIds).not.toContain('A');

      // Side pot: C contributes 100 more (200 - 100), eligible: C only
      expect(pots[1].amount).toBe(100);
      expect(pots[1].eligiblePlayerIds).toEqual(['C']);
    });

    it('should handle folded player who bet more than the all-in player', () => {
      // Player A folds after betting 150, Player B all-in 100, Player C active 200
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 150, status: 'folded' },
        { playerId: 'B', totalBetThisHand: 100, status: 'all_in' },
        { playerId: 'C', totalBetThisHand: 200, status: 'active' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(2);

      // Main pot at level 100: A contributes 100, B contributes 100, C contributes 100 = 300
      // Eligible: B, C (A is folded)
      expect(pots[0].amount).toBe(300);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['B', 'C']));
      expect(pots[0].eligiblePlayerIds).not.toContain('A');

      // Side pot: A contributes 50 (150-100), C contributes 100 (200-100) = 150
      // Eligible: C only (A is folded, B didn't reach this level)
      expect(pots[1].amount).toBe(150);
      expect(pots[1].eligiblePlayerIds).toEqual(['C']);
    });

    it('should handle all players folded except one with an all-in', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 20, status: 'folded' },
        { playerId: 'B', totalBetThisHand: 20, status: 'folded' },
        { playerId: 'C', totalBetThisHand: 50, status: 'all_in' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(1);

      // Main pot at level 50: A contributes 20, B contributes 20, C contributes 50 = 90
      // Eligible: C only (A and B folded)
      expect(pots[0].amount).toBe(90);
      expect(pots[0].eligiblePlayerIds).toEqual(['C']);
    });
  });

  describe('edge cases', () => {
    it('should handle a single player (degenerate case)', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 100, status: 'all_in' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(100);
      expect(pots[0].eligiblePlayerIds).toEqual(['A']);
    });

    it('should handle two players heads-up with one all-in', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 75, status: 'all_in' },
        { playerId: 'B', totalBetThisHand: 150, status: 'active' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(2);

      // Main pot: 75 × 2 = 150, eligible: A, B
      expect(pots[0].amount).toBe(150);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B']));

      // Side pot: 75 × 1 = 75, eligible: B
      expect(pots[1].amount).toBe(75);
      expect(pots[1].eligiblePlayerIds).toEqual(['B']);
    });

    it('should handle all players all-in at the same amount', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 100, status: 'all_in' },
        { playerId: 'B', totalBetThisHand: 100, status: 'all_in' },
        { playerId: 'C', totalBetThisHand: 100, status: 'all_in' },
      ];

      const pots = calculateSidePots(players);

      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(300);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    });

    it('should handle player with zero bet who is all-in (edge case)', () => {
      const players: PotPlayer[] = [
        { playerId: 'A', totalBetThisHand: 0, status: 'all_in' },
        { playerId: 'B', totalBetThisHand: 100, status: 'active' },
        { playerId: 'C', totalBetThisHand: 100, status: 'active' },
      ];

      const pots = calculateSidePots(players);

      // A contributed 0, so the all-in level at 0 creates no pot
      // The remaining pot is just B and C's contributions
      // Since A bet 0, they don't contribute to any pot
      // The side pot above the 0 level: B contributes 100, C contributes 100 = 200
      // Eligible: B, C (A's bet is 0, so they don't reach the level above 0)
      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(200);
      expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['B', 'C']));
    });
  });
});
