import { describe, it, expect } from 'vitest';
import { BettingRound, RoundProgression, BettingPlayer } from './bettingRound.js';

describe('BettingRound', () => {
  function makeActivePlayers(count: number): BettingPlayer[] {
    return Array.from({ length: count }, () => ({
      status: 'active' as const,
      hasActed: false,
      currentBet: 0,
    }));
  }

  describe('constructor', () => {
    it('should initialize with given players, currentBet, and minRaise', () => {
      const players = makeActivePlayers(3);
      const round = new BettingRound(players, 20, 20);

      expect(round.getCurrentBet()).toBe(20);
      expect(round.getMinRaise()).toBe(20);
      expect(round.getActivePlayers()).toEqual([0, 1, 2]);
    });

    it('should not mutate the original players array', () => {
      const players = makeActivePlayers(2);
      const round = new BettingRound(players, 0, 20);
      round.recordAction(0, { type: 'fold' });

      expect(players[0].status).toBe('active');
    });
  });

  describe('isComplete', () => {
    it('should return false when no players have acted', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      expect(round.isComplete()).toBe(false);
    });

    it('should return false when only some players have acted', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(0, { type: 'check' });
      expect(round.isComplete()).toBe(false);
    });

    it('should return true when all active players have checked', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(0, { type: 'check' });
      round.recordAction(1, { type: 'check' });
      round.recordAction(2, { type: 'check' });
      expect(round.isComplete()).toBe(true);
    });

    it('should return true when all active players have called the current bet', () => {
      const players = makeActivePlayers(3);
      const round = new BettingRound(players, 0, 20);
      round.recordAction(0, { type: 'bet', amount: 40 });
      round.recordAction(1, { type: 'call' });
      round.recordAction(2, { type: 'call' });
      expect(round.isComplete()).toBe(true);
    });

    it('should return false when a raise has been made and not all players responded', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(0, { type: 'bet', amount: 40 });
      round.recordAction(1, { type: 'raise', amount: 80 });
      // Player 0 and 2 haven't responded to the raise
      expect(round.isComplete()).toBe(false);
    });

    it('should return true when raise is called by all remaining players', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(0, { type: 'bet', amount: 40 });
      round.recordAction(1, { type: 'raise', amount: 80 });
      round.recordAction(2, { type: 'call' });
      round.recordAction(0, { type: 'call' });
      expect(round.isComplete()).toBe(true);
    });

    it('should return true when all players except one fold', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(0, { type: 'bet', amount: 40 });
      round.recordAction(1, { type: 'fold' });
      round.recordAction(2, { type: 'fold' });
      // Only one active player remains who has already acted
      expect(round.isComplete()).toBe(true);
    });

    it('should return true when no active players remain (all folded or all-in)', () => {
      const players: BettingPlayer[] = [
        { status: 'all_in', hasActed: true, currentBet: 100 },
        { status: 'all_in', hasActed: true, currentBet: 100 },
        { status: 'folded', hasActed: true, currentBet: 0 },
      ];
      const round = new BettingRound(players, 100, 20);
      expect(round.isComplete()).toBe(true);
    });

    it('should handle preflop with blinds posted (big blind has not acted yet)', () => {
      // Preflop scenario: SB and BB have posted, but BB hasn't "acted" yet
      const players: BettingPlayer[] = [
        { status: 'active', hasActed: false, currentBet: 10 }, // SB
        { status: 'active', hasActed: false, currentBet: 20 }, // BB
        { status: 'active', hasActed: false, currentBet: 0 },  // Dealer/UTG
      ];
      const round = new BettingRound(players, 20, 20);
      expect(round.isComplete()).toBe(false);
    });
  });

  describe('getNextPlayerIndex', () => {
    it('should return the next active player index', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      expect(round.getNextPlayerIndex(0)).toBe(1);
      expect(round.getNextPlayerIndex(1)).toBe(2);
      expect(round.getNextPlayerIndex(2)).toBe(0);
    });

    it('should skip folded players', () => {
      const players: BettingPlayer[] = [
        { status: 'active', hasActed: false, currentBet: 0 },
        { status: 'folded', hasActed: true, currentBet: 0 },
        { status: 'active', hasActed: false, currentBet: 0 },
      ];
      const round = new BettingRound(players, 0, 20);
      expect(round.getNextPlayerIndex(0)).toBe(2);
    });

    it('should skip all-in players', () => {
      const players: BettingPlayer[] = [
        { status: 'active', hasActed: false, currentBet: 0 },
        { status: 'all_in', hasActed: true, currentBet: 100 },
        { status: 'active', hasActed: false, currentBet: 0 },
      ];
      const round = new BettingRound(players, 0, 20);
      expect(round.getNextPlayerIndex(0)).toBe(2);
    });

    it('should wrap around the player array', () => {
      const players: BettingPlayer[] = [
        { status: 'active', hasActed: false, currentBet: 0 },
        { status: 'folded', hasActed: true, currentBet: 0 },
        { status: 'folded', hasActed: true, currentBet: 0 },
      ];
      const round = new BettingRound(players, 0, 20);
      expect(round.getNextPlayerIndex(0)).toBe(0); // wraps back to self
    });

    it('should return -1 when no active players exist', () => {
      const players: BettingPlayer[] = [
        { status: 'folded', hasActed: true, currentBet: 0 },
        { status: 'all_in', hasActed: true, currentBet: 100 },
        { status: 'folded', hasActed: true, currentBet: 0 },
      ];
      const round = new BettingRound(players, 100, 20);
      expect(round.getNextPlayerIndex(0)).toBe(-1);
    });
  });

  describe('recordAction', () => {
    it('should mark player as acted on check', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(0, { type: 'check' });
      const players = round.getPlayers();
      expect(players[0].hasActed).toBe(true);
      expect(players[0].currentBet).toBe(0);
    });

    it('should update currentBet and minRaise on bet', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(0, { type: 'bet', amount: 50 });
      expect(round.getCurrentBet()).toBe(50);
      expect(round.getMinRaise()).toBe(50);
      const players = round.getPlayers();
      expect(players[0].currentBet).toBe(50);
    });

    it('should reset other players hasActed on bet', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(1, { type: 'check' });
      round.recordAction(0, { type: 'bet', amount: 40 });
      const players = round.getPlayers();
      // Player 1 had acted (check) but should be reset after player 0 bets
      expect(players[1].hasActed).toBe(false);
    });

    it('should match current bet on call', () => {
      const round = new BettingRound(makeActivePlayers(3), 20, 20);
      round.recordAction(0, { type: 'call' });
      const players = round.getPlayers();
      expect(players[0].currentBet).toBe(20);
      expect(players[0].hasActed).toBe(true);
    });

    it('should update currentBet and minRaise on raise', () => {
      const round = new BettingRound(makeActivePlayers(3), 20, 20);
      round.recordAction(0, { type: 'raise', amount: 60 });
      expect(round.getCurrentBet()).toBe(60);
      // Raise increment is 60 - 20 = 40, which is > minRaise (20)
      expect(round.getMinRaise()).toBe(40);
    });

    it('should reset other players hasActed on raise', () => {
      const round = new BettingRound(makeActivePlayers(3), 20, 20);
      round.recordAction(0, { type: 'call' });
      round.recordAction(1, { type: 'raise', amount: 60 });
      const players = round.getPlayers();
      expect(players[0].hasActed).toBe(false);
      expect(players[2].hasActed).toBe(false);
    });

    it('should change player status to folded on fold', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(0, { type: 'fold' });
      const players = round.getPlayers();
      expect(players[0].status).toBe('folded');
      expect(players[0].hasActed).toBe(true);
    });

    it('should change player status to all_in on all-in action', () => {
      const players: BettingPlayer[] = [
        { status: 'active', hasActed: false, currentBet: 50 },
        { status: 'active', hasActed: false, currentBet: 0 },
        { status: 'active', hasActed: false, currentBet: 0 },
      ];
      const round = new BettingRound(players, 20, 20);
      round.recordAction(0, { type: 'all_in' });
      const result = round.getPlayers();
      expect(result[0].status).toBe('all_in');
      expect(result[0].hasActed).toBe(true);
    });

    it('should update currentBet when all-in exceeds current bet', () => {
      const players: BettingPlayer[] = [
        { status: 'active', hasActed: false, currentBet: 100 },
        { status: 'active', hasActed: false, currentBet: 0 },
        { status: 'active', hasActed: false, currentBet: 0 },
      ];
      const round = new BettingRound(players, 40, 20);
      round.recordAction(0, { type: 'all_in' });
      expect(round.getCurrentBet()).toBe(100);
    });

    it('should not update currentBet when all-in is less than current bet', () => {
      const players: BettingPlayer[] = [
        { status: 'active', hasActed: false, currentBet: 30 },
        { status: 'active', hasActed: false, currentBet: 0 },
        { status: 'active', hasActed: false, currentBet: 0 },
      ];
      const round = new BettingRound(players, 50, 20);
      round.recordAction(0, { type: 'all_in' });
      expect(round.getCurrentBet()).toBe(50);
    });

    it('should handle invalid player index gracefully', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      // Should not throw
      round.recordAction(5, { type: 'check' });
      round.recordAction(-1, { type: 'check' });
    });
  });

  describe('getActivePlayers', () => {
    it('should return all player indices when all are active', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      expect(round.getActivePlayers()).toEqual([0, 1, 2]);
    });

    it('should exclude folded players', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(1, { type: 'fold' });
      expect(round.getActivePlayers()).toEqual([0, 2]);
    });

    it('should exclude all-in players', () => {
      const players: BettingPlayer[] = [
        { status: 'active', hasActed: false, currentBet: 0 },
        { status: 'all_in', hasActed: true, currentBet: 100 },
        { status: 'active', hasActed: false, currentBet: 0 },
      ];
      const round = new BettingRound(players, 100, 20);
      expect(round.getActivePlayers()).toEqual([0, 2]);
    });

    it('should return empty array when no active players', () => {
      const players: BettingPlayer[] = [
        { status: 'folded', hasActed: true, currentBet: 0 },
        { status: 'all_in', hasActed: true, currentBet: 100 },
        { status: 'folded', hasActed: true, currentBet: 0 },
      ];
      const round = new BettingRound(players, 100, 20);
      expect(round.getActivePlayers()).toEqual([]);
    });
  });

  describe('full betting round scenarios', () => {
    it('should handle a simple preflop round with blinds', () => {
      // 3-player preflop: dealer posts nothing, SB posts 10, BB posts 20
      // Action starts with dealer (UTG in 3-player)
      const players: BettingPlayer[] = [
        { status: 'active', hasActed: false, currentBet: 0 },  // Dealer/UTG
        { status: 'active', hasActed: false, currentBet: 10 }, // SB
        { status: 'active', hasActed: false, currentBet: 20 }, // BB
      ];
      const round = new BettingRound(players, 20, 20);

      // Dealer calls
      round.recordAction(0, { type: 'call' });
      expect(round.isComplete()).toBe(false);

      // SB calls
      round.recordAction(1, { type: 'call' });
      expect(round.isComplete()).toBe(false);

      // BB checks (option)
      round.recordAction(2, { type: 'check' });
      expect(round.isComplete()).toBe(true);
    });

    it('should handle a round where everyone folds to a bet', () => {
      const round = new BettingRound(makeActivePlayers(3), 0, 20);
      round.recordAction(0, { type: 'bet', amount: 40 });
      round.recordAction(1, { type: 'fold' });
      round.recordAction(2, { type: 'fold' });
      expect(round.isComplete()).toBe(true);
      expect(round.getActivePlayers()).toEqual([0]);
    });
  });
});

describe('RoundProgression', () => {
  describe('nextRound', () => {
    it('should return flop after preflop', () => {
      expect(RoundProgression.nextRound('preflop')).toBe('flop');
    });

    it('should return turn after flop', () => {
      expect(RoundProgression.nextRound('flop')).toBe('turn');
    });

    it('should return river after turn', () => {
      expect(RoundProgression.nextRound('turn')).toBe('river');
    });

    it('should return showdown after river', () => {
      expect(RoundProgression.nextRound('river')).toBe('showdown');
    });
  });

  describe('getCommunityCardCount', () => {
    it('should return 0 for preflop', () => {
      expect(RoundProgression.getCommunityCardCount('preflop')).toBe(0);
    });

    it('should return 3 for flop', () => {
      expect(RoundProgression.getCommunityCardCount('flop')).toBe(3);
    });

    it('should return 4 for turn', () => {
      expect(RoundProgression.getCommunityCardCount('turn')).toBe(4);
    });

    it('should return 5 for river', () => {
      expect(RoundProgression.getCommunityCardCount('river')).toBe(5);
    });

    it('should return 5 for showdown', () => {
      expect(RoundProgression.getCommunityCardCount('showdown')).toBe(5);
    });
  });
});
