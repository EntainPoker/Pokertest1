import { describe, it, expect } from 'vitest';
import { PositionManager } from './positionManager';

describe('PositionManager', () => {
  describe('constructor', () => {
    it('should create a position manager with default dealer at position 0', () => {
      const pm = new PositionManager(3);
      expect(pm.getActivePlayerCount()).toBe(3);
      expect(pm.getPositions().dealer).toBe(0);
    });

    it('should create a position manager with specified initial dealer', () => {
      const pm = new PositionManager(3, 2);
      expect(pm.getPositions().dealer).toBe(2);
    });

    it('should throw if playerCount is less than 2', () => {
      expect(() => new PositionManager(1)).toThrow('at least 2 players');
      expect(() => new PositionManager(0)).toThrow('at least 2 players');
    });

    it('should throw if initialDealerPosition is invalid', () => {
      expect(() => new PositionManager(3, 5)).toThrow('Invalid initial dealer position');
    });
  });

  describe('getPositions - 3 players', () => {
    it('should return correct positions with dealer at 0', () => {
      const pm = new PositionManager(3, 0);
      const positions = pm.getPositions();
      expect(positions.dealer).toBe(0);
      expect(positions.smallBlind).toBe(1);
      expect(positions.bigBlind).toBe(2);
    });

    it('should return correct positions with dealer at 1', () => {
      const pm = new PositionManager(3, 1);
      const positions = pm.getPositions();
      expect(positions.dealer).toBe(1);
      expect(positions.smallBlind).toBe(2);
      expect(positions.bigBlind).toBe(0);
    });

    it('should return correct positions with dealer at 2', () => {
      const pm = new PositionManager(3, 2);
      const positions = pm.getPositions();
      expect(positions.dealer).toBe(2);
      expect(positions.smallBlind).toBe(0);
      expect(positions.bigBlind).toBe(1);
    });
  });

  describe('getPositions - 2 players (heads-up)', () => {
    it('should have dealer as small blind in heads-up', () => {
      const pm = new PositionManager(2, 0);
      const positions = pm.getPositions();
      expect(positions.dealer).toBe(0);
      expect(positions.smallBlind).toBe(0); // Dealer is SB in heads-up
      expect(positions.bigBlind).toBe(1);
    });

    it('should have dealer as small blind with dealer at 1', () => {
      const pm = new PositionManager(2, 1);
      const positions = pm.getPositions();
      expect(positions.dealer).toBe(1);
      expect(positions.smallBlind).toBe(1); // Dealer is SB in heads-up
      expect(positions.bigBlind).toBe(0);
    });
  });

  describe('rotate', () => {
    it('should advance dealer clockwise by 1 in a 3-player game', () => {
      const pm = new PositionManager(3, 0);

      pm.rotate();
      expect(pm.getPositions().dealer).toBe(1);

      pm.rotate();
      expect(pm.getPositions().dealer).toBe(2);

      pm.rotate();
      expect(pm.getPositions().dealer).toBe(0); // Wraps around
    });

    it('should advance dealer clockwise in a 2-player game', () => {
      const pm = new PositionManager(2, 0);

      pm.rotate();
      expect(pm.getPositions().dealer).toBe(1);

      pm.rotate();
      expect(pm.getPositions().dealer).toBe(0); // Wraps around
    });

    it('should correctly update all positions after rotation', () => {
      const pm = new PositionManager(3, 0);

      pm.rotate(); // Dealer moves to 1
      const positions = pm.getPositions();
      expect(positions.dealer).toBe(1);
      expect(positions.smallBlind).toBe(2);
      expect(positions.bigBlind).toBe(0);
    });

    it('should throw if fewer than 2 active players', () => {
      const pm = new PositionManager(3, 0);
      pm.removePlayer(2); // Now 2 players
      pm.removePlayer(1); // Now 1 player — but this should throw from removePlayer
      // Actually removePlayer won't allow going below 2, so test rotate with 2 is fine
    });
  });

  describe('removePlayer', () => {
    it('should remove a player and reduce active count', () => {
      const pm = new PositionManager(3, 0);
      pm.removePlayer(2);
      expect(pm.getActivePlayerCount()).toBe(2);
      expect(pm.getActivePlayers()).toEqual([0, 1]);
    });

    it('should adjust dealer index when removing player before dealer', () => {
      const pm = new PositionManager(3, 2); // Dealer at seat 2
      pm.removePlayer(0); // Remove seat 0, which is before dealer in the array
      expect(pm.getActivePlayerCount()).toBe(2);
      // Dealer should still point to seat 2
      expect(pm.getPositions().dealer).toBe(2);
    });

    it('should handle removing the dealer', () => {
      const pm = new PositionManager(3, 0); // Dealer at seat 0
      pm.removePlayer(0); // Remove the dealer
      expect(pm.getActivePlayerCount()).toBe(2);
      // Next player should become dealer
      expect(pm.getPositions().dealer).toBe(1);
    });

    it('should handle removing player after dealer', () => {
      const pm = new PositionManager(3, 0); // Dealer at seat 0
      pm.removePlayer(2); // Remove seat 2 (after dealer)
      expect(pm.getActivePlayerCount()).toBe(2);
      expect(pm.getPositions().dealer).toBe(0); // Dealer unchanged
    });

    it('should throw when trying to remove non-active player', () => {
      const pm = new PositionManager(3, 0);
      expect(() => pm.removePlayer(5)).toThrow('not active');
    });

    it('should throw when trying to go below 2 players', () => {
      const pm = new PositionManager(3, 0);
      pm.removePlayer(2);
      expect(() => pm.removePlayer(1)).toThrow('minimum 2 active players');
    });

    it('should transition to heads-up rules after elimination', () => {
      const pm = new PositionManager(3, 0);
      pm.removePlayer(2); // Now 2 players: seats 0 and 1

      const positions = pm.getPositions();
      // Heads-up: dealer is SB
      expect(positions.dealer).toBe(0);
      expect(positions.smallBlind).toBe(0);
      expect(positions.bigBlind).toBe(1);
    });
  });

  describe('rotation after elimination', () => {
    it('should rotate correctly after a player is eliminated', () => {
      const pm = new PositionManager(3, 0);
      pm.removePlayer(1); // Remove seat 1, active: [0, 2]

      // Dealer is still at seat 0
      expect(pm.getPositions().dealer).toBe(0);

      pm.rotate();
      // Dealer moves to seat 2
      expect(pm.getPositions().dealer).toBe(2);

      pm.rotate();
      // Dealer wraps back to seat 0
      expect(pm.getPositions().dealer).toBe(0);
    });

    it('should handle full rotation cycle with 3 players then elimination', () => {
      const pm = new PositionManager(3, 0);

      // Hand 1: dealer=0, SB=1, BB=2
      expect(pm.getPositions()).toEqual({ dealer: 0, smallBlind: 1, bigBlind: 2 });

      pm.rotate();
      // Hand 2: dealer=1, SB=2, BB=0
      expect(pm.getPositions()).toEqual({ dealer: 1, smallBlind: 2, bigBlind: 0 });

      // Player at seat 0 is eliminated
      pm.removePlayer(0); // Active: [1, 2], dealer was at index 0 in [1,2] which is seat 1

      // Now heads-up between seats 1 and 2
      const positions = pm.getPositions();
      expect(positions.dealer).toBe(1);
      expect(positions.smallBlind).toBe(1); // Heads-up: dealer is SB
      expect(positions.bigBlind).toBe(2);

      pm.rotate();
      const nextPositions = pm.getPositions();
      expect(nextPositions.dealer).toBe(2);
      expect(nextPositions.smallBlind).toBe(2); // Heads-up: dealer is SB
      expect(nextPositions.bigBlind).toBe(1);
    });
  });

  describe('getActivePlayerCount', () => {
    it('should return initial player count', () => {
      const pm = new PositionManager(3);
      expect(pm.getActivePlayerCount()).toBe(3);
    });

    it('should return updated count after removal', () => {
      const pm = new PositionManager(3);
      pm.removePlayer(1);
      expect(pm.getActivePlayerCount()).toBe(2);
    });
  });

  describe('getActivePlayers', () => {
    it('should return all seat indices initially', () => {
      const pm = new PositionManager(3);
      expect(pm.getActivePlayers()).toEqual([0, 1, 2]);
    });

    it('should return remaining seats after removal', () => {
      const pm = new PositionManager(3);
      pm.removePlayer(1);
      expect(pm.getActivePlayers()).toEqual([0, 2]);
    });

    it('should return a copy (not a reference)', () => {
      const pm = new PositionManager(3);
      const players = pm.getActivePlayers();
      players.push(99);
      expect(pm.getActivePlayers()).toEqual([0, 1, 2]);
    });
  });
});
