import { describe, it, expect } from 'vitest';
import { Card } from '@spin-and-go/shared';
import { checkFoldWin, FoldWinPlayer } from './foldWin';

// Helper to create a card
function card(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

describe('checkFoldWin', () => {
  describe('returns null when hand should continue', () => {
    it('returns null when all players are active', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'active', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'active', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'active', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      expect(checkFoldWin(players)).toBeNull();
    });

    it('returns null when two players are still active', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'active', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'folded', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'active', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      expect(checkFoldWin(players)).toBeNull();
    });

    it('returns null when one player is active and one is all-in', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'active', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'folded', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'all_in', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      expect(checkFoldWin(players)).toBeNull();
    });

    it('returns null when all players are all-in', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'all_in', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'all_in', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'all_in', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      expect(checkFoldWin(players)).toBeNull();
    });
  });

  describe('awards pot to last remaining player', () => {
    it('awards pot when all but one player folds (winner is active)', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'active', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'folded', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'folded', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      const result = checkFoldWin(players);

      expect(result).not.toBeNull();
      expect(result!.winnerId).toBe('p1');
    });

    it('awards pot when all but one player folds (winner is all-in)', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'folded', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'all_in', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'folded', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      const result = checkFoldWin(players);

      expect(result).not.toBeNull();
      expect(result!.winnerId).toBe('p2');
    });

    it('works with 2-player game', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'folded', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'active', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
      ];

      const result = checkFoldWin(players);

      expect(result).not.toBeNull();
      expect(result!.winnerId).toBe('p2');
    });
  });

  describe('hand result uses fold method', () => {
    it('sets method to fold', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'active', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'folded', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'folded', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      const result = checkFoldWin(players)!;

      expect(result.handResult.method).toBe('fold');
    });

    it('sets winningHand to null (no showdown)', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'active', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'folded', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'folded', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      const result = checkFoldWin(players)!;

      expect(result.handResult.winningHand).toBeNull();
    });

    it('sets winnerId correctly in handResult', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'folded', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'folded', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'active', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      const result = checkFoldWin(players)!;

      expect(result.handResult.winnerId).toBe('p3');
    });
  });

  describe('does not reveal folded players hole cards', () => {
    it('sets all player hole cards to null in playerResults', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'active', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'folded', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'folded', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      const result = checkFoldWin(players)!;

      // All players' hole cards should be null (not revealed)
      for (const playerResult of result.playerResults) {
        expect(playerResult.holeCards).toBeNull();
      }
    });

    it('does not reveal winner hole cards either', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'active', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'folded', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'folded', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      const result = checkFoldWin(players)!;

      const winnerResult = result.playerResults.find(p => p.playerId === 'p1');
      expect(winnerResult).toBeDefined();
      expect(winnerResult!.holeCards).toBeNull();
    });

    it('includes all players in playerResults', () => {
      const players: FoldWinPlayer[] = [
        { playerId: 'p1', username: 'Alice', status: 'active', holeCards: [card('A', 'spades'), card('K', 'spades')] },
        { playerId: 'p2', username: 'Bob', status: 'folded', holeCards: [card('Q', 'hearts'), card('J', 'hearts')] },
        { playerId: 'p3', username: 'Charlie', status: 'folded', holeCards: [card('10', 'diamonds'), card('9', 'diamonds')] },
      ];

      const result = checkFoldWin(players)!;

      expect(result.playerResults).toHaveLength(3);
      expect(result.playerResults.map(p => p.playerId).sort()).toEqual(['p1', 'p2', 'p3']);
    });
  });
});
