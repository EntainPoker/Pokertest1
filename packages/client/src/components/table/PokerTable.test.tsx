import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PokerTable } from './PokerTable';
import type { HandState } from '@spin-and-go/shared';

function createMockHandState(overrides?: Partial<HandState>): HandState {
  return {
    id: 'hand-1',
    tournamentId: 'tournament-1',
    handNumber: 1,
    dealerPosition: 0,
    smallBlindPosition: 1,
    bigBlindPosition: 2,
    communityCards: [],
    pot: 60,
    sidePots: [],
    players: [
      {
        playerId: 'player-1',
        username: 'Alice',
        holeCards: [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'hearts' }],
        chipCount: 470,
        currentBet: 20,
        totalBetThisHand: 20,
        status: 'active',
        hasActed: true,
      },
      {
        playerId: 'player-2',
        username: 'Bob',
        holeCards: [{ rank: '10', suit: 'diamonds' }, { rank: 'J', suit: 'clubs' }],
        chipCount: 490,
        currentBet: 10,
        totalBetThisHand: 10,
        status: 'active',
        hasActed: true,
      },
      {
        playerId: 'player-3',
        username: 'Charlie',
        holeCards: [{ rank: '7', suit: 'hearts' }, { rank: '8', suit: 'spades' }],
        chipCount: 480,
        currentBet: 20,
        totalBetThisHand: 20,
        status: 'active',
        hasActed: false,
      },
    ],
    currentPlayerIndex: 2,
    bettingRound: 'preflop',
    currentBet: 20,
    minRaise: 20,
    lastAction: null,
    turnStartedAt: new Date(),
    turnTimeoutSeconds: 30,
    ...overrides,
  };
}

describe('PokerTable', () => {
  it('renders all 3 player seats', () => {
    const handState = createMockHandState();
    render(<PokerTable handState={handState} currentPlayerId="player-1" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('displays the pot amount', () => {
    const handState = createMockHandState({ pot: 150 });
    render(<PokerTable handState={handState} currentPlayerId="player-1" />);

    expect(screen.getByText('Pot: $150')).toBeInTheDocument();
  });

  it('shows hole cards only for the current player', () => {
    const handState = createMockHandState();
    render(<PokerTable handState={handState} currentPlayerId="player-1" />);

    // Current player's cards should be face-up
    expect(screen.getByLabelText('A of spades')).toBeInTheDocument();
    expect(screen.getByLabelText('K of hearts')).toBeInTheDocument();
  });

  it('highlights the active player', () => {
    const handState = createMockHandState({ currentPlayerIndex: 2 });
    render(<PokerTable handState={handState} currentPlayerId="player-1" />);

    // Charlie (index 2) should be marked active
    const charlieLabel = screen.getByLabelText(/Charlie.*active/);
    expect(charlieLabel).toBeInTheDocument();
  });

  it('shows dealer button on the correct player', () => {
    const handState = createMockHandState({ dealerPosition: 1 });
    render(<PokerTable handState={handState} currentPlayerId="player-1" />);

    // Bob (index 1) should have the dealer indicator
    const bobSeat = screen.getByLabelText(/Bob/);
    expect(bobSeat.querySelector('[class*="bg-white"]')).not.toBeNull();
  });

  it('displays community cards when present', () => {
    const handState = createMockHandState({
      communityCards: [
        { rank: '2', suit: 'hearts' },
        { rank: '5', suit: 'clubs' },
        { rank: 'Q', suit: 'diamonds' },
      ],
    });
    render(<PokerTable handState={handState} currentPlayerId="player-1" />);

    expect(screen.getByLabelText('2 of hearts')).toBeInTheDocument();
    expect(screen.getByLabelText('5 of clubs')).toBeInTheDocument();
    expect(screen.getByLabelText('Q of diamonds')).toBeInTheDocument();
  });

  it('shows folded state for folded players', () => {
    const handState = createMockHandState();
    handState.players[1].status = 'folded';
    render(<PokerTable handState={handState} currentPlayerId="player-1" />);

    expect(screen.getByText('Folded')).toBeInTheDocument();
  });
});
