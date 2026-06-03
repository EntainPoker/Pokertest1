/**
 * PositionManager - Tracks dealer, small blind, and big blind positions
 * and handles clockwise rotation after each hand.
 *
 * Position rules:
 * - 3-player game: dealer, small blind (dealer+1), big blind (dealer+2)
 * - 2-player (heads-up): dealer is also small blind, other player is big blind
 *
 * Positions are tracked as seat indices (0-based) in a fixed-size array.
 * Active players are tracked separately to handle eliminations.
 */

export interface Positions {
  dealer: number;
  smallBlind: number;
  bigBlind: number;
}

export class PositionManager {
  private activePlayers: number[]; // Array of active seat indices
  private dealerIndex: number; // Index into activePlayers array

  /**
   * @param playerCount - Initial number of players (seats 0 to playerCount-1)
   * @param initialDealerPosition - The seat index of the initial dealer (default: 0)
   */
  constructor(playerCount: number, initialDealerPosition: number = 0) {
    if (playerCount < 2) {
      throw new Error('PositionManager requires at least 2 players');
    }

    // Initialize active players as seat indices [0, 1, ..., playerCount-1]
    this.activePlayers = Array.from({ length: playerCount }, (_, i) => i);

    // Find the index of the initial dealer position in the active players array
    const idx = this.activePlayers.indexOf(initialDealerPosition);
    if (idx === -1) {
      throw new Error(`Invalid initial dealer position: ${initialDealerPosition}`);
    }
    this.dealerIndex = idx;
  }

  /**
   * Returns the current dealer, small blind, and big blind seat positions.
   */
  getPositions(): Positions {
    const count = this.activePlayers.length;

    if (count < 2) {
      throw new Error('Cannot determine positions with fewer than 2 active players');
    }

    const dealer = this.activePlayers[this.dealerIndex];

    if (count === 2) {
      // Heads-up: dealer is also small blind, other player is big blind
      const smallBlind = dealer;
      const bigBlindIndex = (this.dealerIndex + 1) % count;
      const bigBlind = this.activePlayers[bigBlindIndex];
      return { dealer, smallBlind, bigBlind };
    }

    // 3+ players: SB is next after dealer, BB is next after SB
    const smallBlindIndex = (this.dealerIndex + 1) % count;
    const bigBlindIndex = (this.dealerIndex + 2) % count;
    const smallBlind = this.activePlayers[smallBlindIndex];
    const bigBlind = this.activePlayers[bigBlindIndex];

    return { dealer, smallBlind, bigBlind };
  }

  /**
   * Advances the dealer position clockwise by 1 (to the next active player).
   */
  rotate(): void {
    if (this.activePlayers.length < 2) {
      throw new Error('Cannot rotate with fewer than 2 active players');
    }
    this.dealerIndex = (this.dealerIndex + 1) % this.activePlayers.length;
  }

  /**
   * Removes a player (by seat index) from the active players list.
   * Adjusts the dealer index to maintain correct position tracking.
   *
   * @param position - The seat index of the player to remove
   */
  removePlayer(position: number): void {
    const idx = this.activePlayers.indexOf(position);
    if (idx === -1) {
      throw new Error(`Player at position ${position} is not active`);
    }

    if (this.activePlayers.length <= 2) {
      throw new Error('Cannot remove player: minimum 2 active players required');
    }

    // If the removed player is before or at the dealer index, shift dealer back
    if (idx < this.dealerIndex) {
      this.dealerIndex--;
    } else if (idx === this.dealerIndex) {
      // If the dealer is removed, the next player becomes dealer
      // dealerIndex stays the same but wraps if needed after removal
      if (this.dealerIndex >= this.activePlayers.length - 1) {
        this.dealerIndex = 0;
      }
    }

    this.activePlayers.splice(idx, 1);

    // Ensure dealerIndex is within bounds after removal
    if (this.dealerIndex >= this.activePlayers.length) {
      this.dealerIndex = 0;
    }
  }

  /**
   * Returns the number of currently active players.
   */
  getActivePlayerCount(): number {
    return this.activePlayers.length;
  }

  /**
   * Returns the list of active player seat indices (for testing/debugging).
   */
  getActivePlayers(): number[] {
    return [...this.activePlayers];
  }
}
