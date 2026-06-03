import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerStandings } from './PlayerStandings';
import type { TournamentPlayer } from '@spin-and-go/shared';

const activePlayers: TournamentPlayer[] = [
  {
    playerId: 'p1',
    username: 'Alice',
    chipCount: 300,
    status: 'active',
    finishPosition: null,
    eliminatedAt: null,
  },
  {
    playerId: 'p2',
    username: 'Bob',
    chipCount: 500,
    status: 'active',
    finishPosition: null,
    eliminatedAt: null,
  },
];

const mixedPlayers: TournamentPlayer[] = [
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
    chipCount: 0,
    status: 'eliminated',
    finishPosition: 3,
    eliminatedAt: new Date('2024-01-01T00:10:00Z'),
  },
  {
    playerId: 'p3',
    username: 'Charlie',
    chipCount: 0,
    status: 'eliminated',
    finishPosition: 2,
    eliminatedAt: new Date('2024-01-01T00:15:00Z'),
  },
];

describe('PlayerStandings', () => {
  it('renders all players', () => {
    render(<PlayerStandings players={activePlayers} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows chip count for active players', () => {
    render(<PlayerStandings players={activePlayers} />);
    expect(screen.getByText('300 chips')).toBeInTheDocument();
    expect(screen.getByText('500 chips')).toBeInTheDocument();
  });

  it('shows Active badge for active players', () => {
    render(<PlayerStandings players={activePlayers} />);
    const badges = screen.getAllByText('Active');
    expect(badges).toHaveLength(2);
  });

  it('shows Eliminated badge and finishing position for eliminated players', () => {
    render(<PlayerStandings players={mixedPlayers} />);
    expect(screen.getByText('Eliminated')).toBeInTheDocument();
    expect(screen.getByText('3rd')).toBeInTheDocument();
  });

  it('shows 2nd position label correctly', () => {
    render(<PlayerStandings players={mixedPlayers} />);
    expect(screen.getByText('2nd')).toBeInTheDocument();
  });

  it('sorts active players first by chips descending', () => {
    render(<PlayerStandings players={activePlayers} />);
    const list = screen.getByRole('list');
    const items = list.querySelectorAll('li');
    // Bob has 500 chips, Alice has 300 — Bob should be first
    expect(items[0]).toHaveTextContent('Bob');
    expect(items[1]).toHaveTextContent('Alice');
  });

  it('sorts active before eliminated, then eliminated by position', () => {
    render(<PlayerStandings players={mixedPlayers} />);
    const list = screen.getByRole('list');
    const items = list.querySelectorAll('li');
    // Active first (Alice), then eliminated by position (Charlie 2nd, Bob 3rd)
    expect(items[0]).toHaveTextContent('Alice');
    expect(items[1]).toHaveTextContent('Charlie');
    expect(items[2]).toHaveTextContent('Bob');
  });

  it('has accessible list label', () => {
    render(<PlayerStandings players={activePlayers} />);
    expect(screen.getByLabelText('Player standings')).toBeInTheDocument();
  });
});
