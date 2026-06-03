import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TournamentLobby } from './TournamentLobby';
import type { Tournament } from '@spin-and-go/shared';

const mockTournament: Tournament = {
  id: 'tournament-1',
  gameInstanceId: 'game-1',
  players: [
    {
      playerId: 'p1',
      username: 'Alice',
      chipCount: 800,
      status: 'active',
      finishPosition: null,
      eliminatedAt: null,
    },
    {
      playerId: 'p2',
      username: 'Bob',
      chipCount: 200,
      status: 'active',
      finishPosition: null,
      eliminatedAt: null,
    },
    {
      playerId: 'p3',
      username: 'Charlie',
      chipCount: 0,
      status: 'eliminated',
      finishPosition: 3,
      eliminatedAt: new Date('2024-01-01T00:10:00Z'),
    },
  ],
  currentBlindLevel: 2,
  blindSchedule: [
    { level: 1, smallBlind: 10, bigBlind: 20 },
    { level: 2, smallBlind: 15, bigBlind: 30 },
    { level: 3, smallBlind: 25, bigBlind: 50 },
    { level: 4, smallBlind: 50, bigBlind: 100 },
  ],
  startedAt: new Date('2024-01-01T00:00:00Z'),
  completedAt: null,
  prizePool: 3,
  winnerId: null,
  status: 'active',
};

describe('TournamentLobby', () => {
  it('renders the tournament lobby dialog', () => {
    render(
      <TournamentLobby tournament={mockTournament} timeRemaining={120} onClose={() => {}} />
    );
    expect(screen.getByRole('dialog', { name: 'Tournament Lobby' })).toBeInTheDocument();
  });

  it('displays current blind level and amounts', () => {
    render(
      <TournamentLobby tournament={mockTournament} timeRemaining={120} onClose={() => {}} />
    );
    expect(screen.getByText('Level 2')).toBeInTheDocument();
    expect(screen.getByText('15/30')).toBeInTheDocument();
  });

  it('displays next blind level and amounts', () => {
    render(
      <TournamentLobby tournament={mockTournament} timeRemaining={120} onClose={() => {}} />
    );
    expect(screen.getByText('Level 3')).toBeInTheDocument();
    expect(screen.getByText('25/50')).toBeInTheDocument();
  });

  it('displays countdown timer', () => {
    render(
      <TournamentLobby tournament={mockTournament} timeRemaining={90} onClose={() => {}} />
    );
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('displays prize pool amount', () => {
    render(
      <TournamentLobby tournament={mockTournament} timeRemaining={120} onClose={() => {}} />
    );
    expect(screen.getByText('$3')).toBeInTheDocument();
  });

  it('displays payout structure as winner takes all', () => {
    render(
      <TournamentLobby tournament={mockTournament} timeRemaining={120} onClose={() => {}} />
    );
    expect(screen.getByText('Winner takes all')).toBeInTheDocument();
  });

  it('displays player standings with all players', () => {
    render(
      <TournamentLobby tournament={mockTournament} timeRemaining={120} onClose={() => {}} />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <TournamentLobby tournament={mockTournament} timeRemaining={120} onClose={onClose} />
    );
    fireEvent.click(screen.getByLabelText('Close tournament lobby'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <TournamentLobby tournament={mockTournament} timeRemaining={120} onClose={onClose} />
    );
    // The backdrop is the first child with bg-black/60
    const backdrop = document.querySelector('.bg-black\\/60');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays Final when at the last blind level', () => {
    const lastLevelTournament: Tournament = {
      ...mockTournament,
      currentBlindLevel: 4,
      blindSchedule: [
        { level: 1, smallBlind: 10, bigBlind: 20 },
        { level: 2, smallBlind: 15, bigBlind: 30 },
        { level: 3, smallBlind: 25, bigBlind: 50 },
        { level: 4, smallBlind: 50, bigBlind: 100 },
      ],
    };
    render(
      <TournamentLobby tournament={lastLevelTournament} timeRemaining={0} onClose={() => {}} />
    );
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByText('Max level')).toBeInTheDocument();
  });

  it('has accessible close button with minimum touch target', () => {
    render(
      <TournamentLobby tournament={mockTournament} timeRemaining={120} onClose={() => {}} />
    );
    const closeBtn = screen.getByLabelText('Close tournament lobby');
    expect(closeBtn).toHaveClass('min-w-[44px]');
    expect(closeBtn).toHaveClass('min-h-[44px]');
  });
});
