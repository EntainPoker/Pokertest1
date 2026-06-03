import { Card } from '@spin-and-go/shared';

const RANKS: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];

/**
 * Standard 52-card deck with Fisher-Yates shuffle and dealing methods.
 */
export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  /** Resets the deck to a full 52-card ordered state. */
  reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({ rank, suit });
      }
    }
  }

  /** Shuffles the deck in place using the Fisher-Yates algorithm. */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Deals the specified number of cards from the top of the deck.
   * @throws Error if not enough cards remain.
   */
  deal(count: number): Card[] {
    if (count > this.cards.length) {
      throw new Error(
        `Cannot deal ${count} cards: only ${this.cards.length} remaining`
      );
    }
    return this.cards.splice(0, count);
  }

  /**
   * Deals 2 hole cards to each player.
   * Cards are dealt one at a time in round-robin fashion (as in real poker).
   */
  dealHoleCards(playerCount: number): Card[][] {
    const required = playerCount * 2;
    if (required > this.cards.length) {
      throw new Error(
        `Cannot deal hole cards for ${playerCount} players: only ${this.cards.length} cards remaining`
      );
    }

    const hands: Card[][] = Array.from({ length: playerCount }, () => []);

    // Deal one card to each player, then a second card to each player
    for (let round = 0; round < 2; round++) {
      for (let p = 0; p < playerCount; p++) {
        hands[p].push(this.cards.shift()!);
      }
    }

    return hands;
  }

  /** Deals 3 community cards (the flop). */
  dealFlop(): Card[] {
    return this.deal(3);
  }

  /** Deals 1 community card (the turn). */
  dealTurn(): Card {
    return this.deal(1)[0];
  }

  /** Deals 1 community card (the river). */
  dealRiver(): Card {
    return this.deal(1)[0];
  }

  /** Returns the number of cards remaining in the deck. */
  remaining(): number {
    return this.cards.length;
  }
}
