import { describe, it, expect } from 'vitest';
import {
  checkEliminations,
  checkTournamentComplete,
  EliminationPlayer,
} from './tournamentElimination.js';

describe('checkEliminations', () => {
  describe('no eliminations', () => {
    it('should return no eliminations when all players have chips', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 300, startingChipsThisHand: 250 },
        { playerId: 'B', username: 'Bob', chipCount: 100, startingChipsThisHand: 150 },
        { playerId: 'C', username: 'Charlie', chipCount: 100, startingChipsThisHand: 100 },
      ];

      const result = checkEliminations(players);

      expect(result.eliminatedPlayers).toHaveLength(0);
      expect(result.remainingPlayers).toEqual(expect.arrayContaining(['A', 'B', 'C']));
      expect(result.remainingPlayers).toHaveLength(3);
    });

    it('should return all players as remaining when no one is at 0', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 1, startingChipsThisHand: 500 },
        { playerId: 'B', username: 'Bob', chipCount: 499, startingChipsThisHand: 500 },
      ];

      const result = checkEliminations(players);

      expect(result.eliminatedPlayers).toHaveLength(0);
      expect(result.remainingPlayers).toEqual(expect.arrayContaining(['A', 'B']));
    });
  });

  describe('single elimination', () => {
    it('should detect a single player elimination (first elimination in 3-player game)', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 400, startingChipsThisHand: 300 },
        { playerId: 'B', username: 'Bob', chipCount: 100, startingChipsThisHand: 100 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 100 },
      ];

      const result = checkEliminations(players, 0);

      expect(result.eliminatedPlayers).toHaveLength(1);
      expect(result.eliminatedPlayers[0]).toEqual({ playerId: 'C', position: 3 });
      expect(result.remainingPlayers).toEqual(expect.arrayContaining(['A', 'B']));
      expect(result.remainingPlayers).toHaveLength(2);
    });

    it('should assign 2nd place to the second eliminated player', () => {
      // One player already eliminated, now another goes out
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 500, startingChipsThisHand: 400 },
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 100 },
      ];

      const result = checkEliminations(players, 1); // 1 already eliminated

      expect(result.eliminatedPlayers).toHaveLength(1);
      expect(result.eliminatedPlayers[0]).toEqual({ playerId: 'B', position: 2 });
      expect(result.remainingPlayers).toEqual(['A']);
    });
  });

  describe('simultaneous elimination', () => {
    it('should assign higher position to player with more starting chips', () => {
      // Both B and C eliminated on same hand
      // C had more chips at start, so C gets higher (better) position
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 500, startingChipsThisHand: 200 },
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 100 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 200 },
      ];

      const result = checkEliminations(players, 0);

      expect(result.eliminatedPlayers).toHaveLength(2);

      // C had more starting chips (200 > 100), so C gets position 2 (better)
      // B had fewer starting chips (100), so B gets position 3 (worse)
      const playerC = result.eliminatedPlayers.find((p) => p.playerId === 'C');
      const playerB = result.eliminatedPlayers.find((p) => p.playerId === 'B');

      expect(playerC).toEqual({ playerId: 'C', position: 2 });
      expect(playerB).toEqual({ playerId: 'B', position: 3 });
      expect(result.remainingPlayers).toEqual(['A']);
    });

    it('should handle simultaneous elimination with equal starting chips', () => {
      // Both eliminated with same starting chips - order is deterministic but either is acceptable
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 500, startingChipsThisHand: 200 },
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 150 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 150 },
      ];

      const result = checkEliminations(players, 0);

      expect(result.eliminatedPlayers).toHaveLength(2);

      // Both get positions 2 and 3 (one each)
      const positions = result.eliminatedPlayers.map((p) => p.position).sort();
      expect(positions).toEqual([2, 3]);
      expect(result.remainingPlayers).toEqual(['A']);
    });

    it('should handle all three players eliminated simultaneously (edge case)', () => {
      // Theoretically impossible in real poker, but the logic should handle it
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 0, startingChipsThisHand: 300 },
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 100 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 100 },
      ];

      const result = checkEliminations(players, 0);

      expect(result.eliminatedPlayers).toHaveLength(3);

      // A had most starting chips, gets best position (1)
      const playerA = result.eliminatedPlayers.find((p) => p.playerId === 'A');
      expect(playerA).toEqual({ playerId: 'A', position: 1 });

      expect(result.remainingPlayers).toHaveLength(0);
    });
  });

  describe('position assignment correctness', () => {
    it('should assign position 3 to first eliminated in a 3-player tournament', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 250, startingChipsThisHand: 200 },
        { playerId: 'B', username: 'Bob', chipCount: 250, startingChipsThisHand: 200 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 100 },
      ];

      const result = checkEliminations(players, 0);

      expect(result.eliminatedPlayers[0].position).toBe(3);
    });

    it('should correctly use previouslyEliminated count for position calculation', () => {
      // In a 6-player tournament, 2 already eliminated, now 1 more goes out
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 500, startingChipsThisHand: 400 },
        { playerId: 'B', username: 'Bob', chipCount: 300, startingChipsThisHand: 300 },
        { playerId: 'C', username: 'Charlie', chipCount: 200, startingChipsThisHand: 200 },
        { playerId: 'D', username: 'Dave', chipCount: 0, startingChipsThisHand: 100 },
      ];

      const result = checkEliminations(players, 2); // 2 already eliminated from 6-player game

      expect(result.eliminatedPlayers).toHaveLength(1);
      // Total players = 4 + 2 = 6, previously eliminated = 2
      // Next position = 6 - 2 = 4
      expect(result.eliminatedPlayers[0]).toEqual({ playerId: 'D', position: 4 });
    });
  });
});

describe('checkTournamentComplete', () => {
  describe('tournament continues', () => {
    it('should return null when multiple players have chips', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 300, startingChipsThisHand: 250 },
        { playerId: 'B', username: 'Bob', chipCount: 100, startingChipsThisHand: 150 },
        { playerId: 'C', username: 'Charlie', chipCount: 100, startingChipsThisHand: 100 },
      ];

      const result = checkTournamentComplete(players);

      expect(result).toBeNull();
    });

    it('should return null when two players remain', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 400, startingChipsThisHand: 300 },
        { playerId: 'B', username: 'Bob', chipCount: 100, startingChipsThisHand: 200 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 0 },
      ];

      const result = checkTournamentComplete(players);

      expect(result).toBeNull();
    });
  });

  describe('tournament complete', () => {
    it('should declare winner when only one player has chips (3-player game)', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 500, startingChipsThisHand: 400 },
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 50 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 50 },
      ];

      const result = checkTournamentComplete(players);

      expect(result).not.toBeNull();
      expect(result!.winnerId).toBe('A');
      expect(result!.winnerUsername).toBe('Alice');
    });

    it('should calculate prize pool as $1 × number of players = $3', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 500, startingChipsThisHand: 400 },
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 50 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 50 },
      ];

      const result = checkTournamentComplete(players);

      expect(result!.prizePool).toBe(3);
    });

    it('should include complete standings with all players', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 500, startingChipsThisHand: 400 },
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 80 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 20 },
      ];

      const result = checkTournamentComplete(players);

      expect(result!.standings).toHaveLength(3);

      // Winner is 1st
      expect(result!.standings[0]).toEqual({
        playerId: 'A',
        username: 'Alice',
        position: 1,
      });

      // B had more starting chips than C, so B gets 2nd
      expect(result!.standings[1]).toEqual({
        playerId: 'B',
        username: 'Bob',
        position: 2,
      });

      // C had fewer starting chips, gets 3rd
      expect(result!.standings[2]).toEqual({
        playerId: 'C',
        username: 'Charlie',
        position: 3,
      });
    });

    it('should handle simultaneous final elimination with tiebreaker', () => {
      // Both B and C eliminated on the final hand
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 500, startingChipsThisHand: 200 },
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 100 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 200 },
      ];

      const result = checkTournamentComplete(players);

      expect(result).not.toBeNull();
      expect(result!.winnerId).toBe('A');

      // C had more starting chips (200 > 100), so C gets 2nd
      const secondPlace = result!.standings.find((s) => s.position === 2);
      const thirdPlace = result!.standings.find((s) => s.position === 3);

      expect(secondPlace!.playerId).toBe('C');
      expect(thirdPlace!.playerId).toBe('B');
    });

    it('should award $3 prize pool for a standard 3-player Spin and Go', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'winner', username: 'Winner', chipCount: 1500, startingChipsThisHand: 1000 },
        { playerId: 'second', username: 'Second', chipCount: 0, startingChipsThisHand: 300 },
        { playerId: 'third', username: 'Third', chipCount: 0, startingChipsThisHand: 200 },
      ];

      const result = checkTournamentComplete(players);

      expect(result!.prizePool).toBe(3); // $1 × 3 players
      expect(result!.winnerId).toBe('winner');
    });
  });

  describe('edge cases', () => {
    it('should handle a 2-player tournament completion', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 1000, startingChipsThisHand: 800 },
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 200 },
      ];

      const result = checkTournamentComplete(players);

      expect(result).not.toBeNull();
      expect(result!.winnerId).toBe('A');
      expect(result!.prizePool).toBe(2); // $1 × 2 players
      expect(result!.standings).toHaveLength(2);
      expect(result!.standings[0].position).toBe(1);
      expect(result!.standings[1].position).toBe(2);
    });

    it('should return null when no players have chips (degenerate case)', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'A', username: 'Alice', chipCount: 0, startingChipsThisHand: 200 },
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 200 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 100 },
      ];

      // No player has chips - this shouldn't happen in practice but the function
      // should handle it gracefully (no winner found)
      const result = checkTournamentComplete(players);

      expect(result).toBeNull();
    });

    it('should correctly identify the winner regardless of player order in array', () => {
      const players: EliminationPlayer[] = [
        { playerId: 'B', username: 'Bob', chipCount: 0, startingChipsThisHand: 100 },
        { playerId: 'C', username: 'Charlie', chipCount: 0, startingChipsThisHand: 50 },
        { playerId: 'A', username: 'Alice', chipCount: 500, startingChipsThisHand: 350 },
      ];

      const result = checkTournamentComplete(players);

      expect(result).not.toBeNull();
      expect(result!.winnerId).toBe('A');
      expect(result!.winnerUsername).toBe('Alice');
    });
  });
});
