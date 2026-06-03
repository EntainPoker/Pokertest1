import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActionPanel } from './ActionPanel';
import type { HandState } from '@spin-and-go/shared';

function createMockHandState(overrides: Partial<HandState> = {}): HandState {
  return {
    id: 'hand-1',
    tournamentId: 'tournament-1',
    handNumber: 1,
    dealerPosition: 0,
    smallBlindPosition: 1,
    bigBlindPosition: 2,
    communityCards: [],
    pot: 30,
    sidePots: [],
    players: [
      {
        playerId: 'player-1',
        username: 'Alice',
        holeCards: [],
        chipCount: 480,
        currentBet: 0,
        totalBetThisHand: 0,
        status: 'active',
        hasActed: false,
      },
      {
        playerId: 'player-2',
        username: 'Bob',
        holeCards: [],
        chipCount: 490,
        currentBet: 10,
        totalBetThisHand: 10,
        status: 'active',
        hasActed: false,
      },
      {
        playerId: 'player-3',
        username: 'Charlie',
        holeCards: [],
        chipCount: 480,
        currentBet: 20,
        totalBetThisHand: 20,
        status: 'active',
        hasActed: false,
      },
    ],
    currentPlayerIndex: 0,
    bettingRound: 'preflop',
    currentBet: 20,
    minRaise: 20,
    lastAction: null,
    turnStartedAt: new Date(),
    turnTimeoutSeconds: 30,
    ...overrides,
  };
}

describe('ActionPanel', () => {
  it('renders nothing when it is not the current player turn', () => {
    const handState = createMockHandState({ currentPlayerIndex: 1 });
    const { container } = render(
      <ActionPanel
        handState={handState}
        currentPlayerId="player-1"
        onAction={vi.fn()}
        turnTimeRemaining={30}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows Call and Fold when facing a bet', () => {
    const handState = createMockHandState({ currentPlayerIndex: 0 });
    render(
      <ActionPanel
        handState={handState}
        currentPlayerId="player-1"
        onAction={vi.fn()}
        turnTimeRemaining={30}
      />
    );

    expect(screen.getByText(/Call 20/)).toBeInTheDocument();
    expect(screen.getByText('Fold')).toBeInTheDocument();
  });

  it('shows Check and Bet when no outstanding bet', () => {
    const handState = createMockHandState({
      currentPlayerIndex: 0,
      currentBet: 0,
      players: [
        {
          playerId: 'player-1',
          username: 'Alice',
          holeCards: [],
          chipCount: 480,
          currentBet: 0,
          totalBetThisHand: 0,
          status: 'active',
          hasActed: false,
        },
        {
          playerId: 'player-2',
          username: 'Bob',
          holeCards: [],
          chipCount: 490,
          currentBet: 0,
          totalBetThisHand: 0,
          status: 'active',
          hasActed: false,
        },
        {
          playerId: 'player-3',
          username: 'Charlie',
          holeCards: [],
          chipCount: 480,
          currentBet: 0,
          totalBetThisHand: 0,
          status: 'active',
          hasActed: false,
        },
      ],
    });

    render(
      <ActionPanel
        handState={handState}
        currentPlayerId="player-1"
        onAction={vi.fn()}
        turnTimeRemaining={30}
      />
    );

    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText(/Bet/)).toBeInTheDocument();
    expect(screen.queryByText(/Call/)).not.toBeInTheDocument();
  });

  it('calls onAction with fold when Fold button is clicked', () => {
    const onAction = vi.fn();
    const handState = createMockHandState({ currentPlayerIndex: 0 });

    render(
      <ActionPanel
        handState={handState}
        currentPlayerId="player-1"
        onAction={onAction}
        turnTimeRemaining={30}
      />
    );

    fireEvent.click(screen.getByText('Fold'));
    expect(onAction).toHaveBeenCalledWith({ type: 'fold' });
  });

  it('calls onAction with call when Call button is clicked', () => {
    const onAction = vi.fn();
    const handState = createMockHandState({ currentPlayerIndex: 0 });

    render(
      <ActionPanel
        handState={handState}
        currentPlayerId="player-1"
        onAction={onAction}
        turnTimeRemaining={30}
      />
    );

    fireEvent.click(screen.getByText(/Call 20/));
    expect(onAction).toHaveBeenCalledWith({ type: 'call' });
  });

  it('calls onAction with check when Check button is clicked', () => {
    const onAction = vi.fn();
    const handState = createMockHandState({
      currentPlayerIndex: 0,
      currentBet: 0,
      players: [
        {
          playerId: 'player-1',
          username: 'Alice',
          holeCards: [],
          chipCount: 480,
          currentBet: 0,
          totalBetThisHand: 0,
          status: 'active',
          hasActed: false,
        },
        {
          playerId: 'player-2',
          username: 'Bob',
          holeCards: [],
          chipCount: 490,
          currentBet: 0,
          totalBetThisHand: 0,
          status: 'active',
          hasActed: false,
        },
        {
          playerId: 'player-3',
          username: 'Charlie',
          holeCards: [],
          chipCount: 480,
          currentBet: 0,
          totalBetThisHand: 0,
          status: 'active',
          hasActed: false,
        },
      ],
    });

    render(
      <ActionPanel
        handState={handState}
        currentPlayerId="player-1"
        onAction={onAction}
        turnTimeRemaining={30}
      />
    );

    fireEvent.click(screen.getByText('Check'));
    expect(onAction).toHaveBeenCalledWith({ type: 'check' });
  });

  it('shows All-In when player cannot afford to call', () => {
    const handState = createMockHandState({
      currentPlayerIndex: 0,
      currentBet: 200,
      players: [
        {
          playerId: 'player-1',
          username: 'Alice',
          holeCards: [],
          chipCount: 50, // less than call amount of 200
          currentBet: 0,
          totalBetThisHand: 0,
          status: 'active',
          hasActed: false,
        },
        {
          playerId: 'player-2',
          username: 'Bob',
          holeCards: [],
          chipCount: 300,
          currentBet: 200,
          totalBetThisHand: 200,
          status: 'active',
          hasActed: true,
        },
        {
          playerId: 'player-3',
          username: 'Charlie',
          holeCards: [],
          chipCount: 300,
          currentBet: 200,
          totalBetThisHand: 200,
          status: 'active',
          hasActed: true,
        },
      ],
    });

    render(
      <ActionPanel
        handState={handState}
        currentPlayerId="player-1"
        onAction={vi.fn()}
        turnTimeRemaining={30}
      />
    );

    expect(screen.getByText(/All-In/)).toBeInTheDocument();
  });

  it('displays the turn timer', () => {
    const handState = createMockHandState({ currentPlayerIndex: 0 });
    render(
      <ActionPanel
        handState={handState}
        currentPlayerId="player-1"
        onAction={vi.fn()}
        turnTimeRemaining={25}
      />
    );

    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByText('Your turn')).toBeInTheDocument();
  });

  it('all action buttons have minimum 44x44px touch targets', () => {
    const handState = createMockHandState({ currentPlayerIndex: 0 });
    render(
      <ActionPanel
        handState={handState}
        currentPlayerId="player-1"
        onAction={vi.fn()}
        turnTimeRemaining={30}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button.className).toContain('min-w-[44px]');
      expect(button.className).toContain('min-h-[44px]');
    });
  });
});
