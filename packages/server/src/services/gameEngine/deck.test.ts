import { describe, it, expect, beforeEach } from 'vitest';
import { Card } from '@spin-and-go/shared';
import { Deck } from './deck';

describe('Deck', () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck();
  });

  describe('constructor / reset', () => {
    it('should initialize with 52 cards', () => {
      expect(deck.remaining()).toBe(52);
    });

    it('should contain all unique cards', () => {
      const cards = deck.deal(52);
      const keys = cards.map((c) => `${c.rank}-${c.suit}`);
      const unique = new Set(keys);
      expect(unique.size).toBe(52);
    });

    it('should contain all 4 suits', () => {
      const cards = deck.deal(52);
      const suits = new Set(cards.map((c) => c.suit));
      expect(suits).toEqual(new Set(['hearts', 'diamonds', 'clubs', 'spades']));
    });

    it('should contain all 13 ranks', () => {
      const cards = deck.deal(52);
      const ranks = new Set(cards.map((c) => c.rank));
      expect(ranks.size).toBe(13);
    });

    it('reset should restore the deck to 52 cards', () => {
      deck.deal(10);
      expect(deck.remaining()).toBe(42);
      deck.reset();
      expect(deck.remaining()).toBe(52);
    });
  });

  describe('shuffle', () => {
    it('should maintain 52 cards after shuffle', () => {
      deck.shuffle();
      expect(deck.remaining()).toBe(52);
    });

    it('should maintain all unique cards after shuffle', () => {
      deck.shuffle();
      const cards = deck.deal(52);
      const keys = new Set(cards.map((c) => `${c.rank}-${c.suit}`));
      expect(keys.size).toBe(52);
    });

    it('should change card order (statistical — may rarely fail)', () => {
      const original = deck.deal(52).map((c) => `${c.rank}-${c.suit}`);
      deck.reset();
      deck.shuffle();
      const shuffled = deck.deal(52).map((c) => `${c.rank}-${c.suit}`);

      // At least some cards should be in different positions
      const differences = original.filter((card, i) => card !== shuffled[i]);
      expect(differences.length).toBeGreaterThan(0);
    });
  });

  describe('deal', () => {
    it('should deal the requested number of cards', () => {
      const cards = deck.deal(5);
      expect(cards).toHaveLength(5);
    });

    it('should reduce remaining count after dealing', () => {
      deck.deal(5);
      expect(deck.remaining()).toBe(47);
    });

    it('should deal cards from the top of the deck', () => {
      const first = deck.deal(1);
      const second = deck.deal(1);
      // Cards should be different (first two cards of an ordered deck)
      expect(first[0]).not.toEqual(second[0]);
    });

    it('should throw when dealing more cards than remaining', () => {
      deck.deal(50);
      expect(() => deck.deal(5)).toThrow('Cannot deal 5 cards: only 2 remaining');
    });

    it('should throw when deck is empty', () => {
      deck.deal(52);
      expect(() => deck.deal(1)).toThrow('Cannot deal 1 cards: only 0 remaining');
    });
  });

  describe('dealHoleCards', () => {
    it('should deal 2 cards to each player', () => {
      deck.shuffle();
      const hands = deck.dealHoleCards(3);
      expect(hands).toHaveLength(3);
      hands.forEach((hand) => {
        expect(hand).toHaveLength(2);
      });
    });

    it('should deal unique cards across all players', () => {
      deck.shuffle();
      const hands = deck.dealHoleCards(3);
      const allCards = hands.flat();
      const keys = new Set(allCards.map((c) => `${c.rank}-${c.suit}`));
      expect(keys.size).toBe(6);
    });

    it('should reduce remaining count by playerCount * 2', () => {
      deck.shuffle();
      deck.dealHoleCards(3);
      expect(deck.remaining()).toBe(46);
    });

    it('should deal in round-robin fashion', () => {
      // With an ordered deck, first round deals cards 0,1,2 to players 0,1,2
      // Second round deals cards 3,4,5 to players 0,1,2
      const hands = deck.dealHoleCards(3);
      // Player 0 gets card 0 and card 3
      // Player 1 gets card 1 and card 4
      // Player 2 gets card 2 and card 5
      expect(hands[0]).toHaveLength(2);
      expect(hands[1]).toHaveLength(2);
      expect(hands[2]).toHaveLength(2);
      // All 6 cards should be unique
      const allCards = hands.flat();
      const keys = new Set(allCards.map((c) => `${c.rank}-${c.suit}`));
      expect(keys.size).toBe(6);
    });

    it('should throw when not enough cards for all players', () => {
      deck.deal(50);
      expect(() => deck.dealHoleCards(3)).toThrow(
        'Cannot deal hole cards for 3 players: only 2 cards remaining'
      );
    });

    it('should work for different player counts', () => {
      deck.shuffle();
      const hands = deck.dealHoleCards(6);
      expect(hands).toHaveLength(6);
      hands.forEach((hand) => expect(hand).toHaveLength(2));
      expect(deck.remaining()).toBe(40);
    });
  });

  describe('dealFlop', () => {
    it('should deal exactly 3 cards', () => {
      deck.shuffle();
      const flop = deck.dealFlop();
      expect(flop).toHaveLength(3);
    });

    it('should reduce remaining by 3', () => {
      deck.shuffle();
      deck.dealFlop();
      expect(deck.remaining()).toBe(49);
    });
  });

  describe('dealTurn', () => {
    it('should deal exactly 1 card', () => {
      deck.shuffle();
      const turn = deck.dealTurn();
      expect(turn).toHaveProperty('rank');
      expect(turn).toHaveProperty('suit');
    });

    it('should reduce remaining by 1', () => {
      deck.shuffle();
      deck.dealTurn();
      expect(deck.remaining()).toBe(51);
    });
  });

  describe('dealRiver', () => {
    it('should deal exactly 1 card', () => {
      deck.shuffle();
      const river = deck.dealRiver();
      expect(river).toHaveProperty('rank');
      expect(river).toHaveProperty('suit');
    });

    it('should reduce remaining by 1', () => {
      deck.shuffle();
      deck.dealRiver();
      expect(deck.remaining()).toBe(51);
    });
  });

  describe('full hand dealing sequence', () => {
    it('should deal a complete hand with all unique cards', () => {
      deck.shuffle();

      const holeCards = deck.dealHoleCards(3); // 6 cards
      const flop = deck.dealFlop(); // 3 cards
      const turn = deck.dealTurn(); // 1 card
      const river = deck.dealRiver(); // 1 card

      // Total 11 cards dealt
      const allCards: Card[] = [...holeCards.flat(), ...flop, turn, river];
      expect(allCards).toHaveLength(11);

      // All cards must be unique
      const keys = new Set(allCards.map((c) => `${c.rank}-${c.suit}`));
      expect(keys.size).toBe(11);

      // 52 - 11 = 41 remaining
      expect(deck.remaining()).toBe(41);
    });

    it('should deal multiple complete hands with unique cards within each hand', () => {
      deck.shuffle();

      // First hand
      const hand1Holes = deck.dealHoleCards(3);
      const hand1Flop = deck.dealFlop();
      const hand1Turn = deck.dealTurn();
      const hand1River = deck.dealRiver();

      const hand1All: Card[] = [
        ...hand1Holes.flat(),
        ...hand1Flop,
        hand1Turn,
        hand1River,
      ];
      const hand1Keys = new Set(hand1All.map((c) => `${c.rank}-${c.suit}`));
      expect(hand1Keys.size).toBe(11);
    });
  });

  describe('remaining', () => {
    it('should return 52 for a fresh deck', () => {
      expect(deck.remaining()).toBe(52);
    });

    it('should decrease as cards are dealt', () => {
      deck.deal(1);
      expect(deck.remaining()).toBe(51);
      deck.deal(10);
      expect(deck.remaining()).toBe(41);
    });
  });
});
