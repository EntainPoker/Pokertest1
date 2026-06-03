import type { LobbyGame } from '../../stores/lobbyStore';

interface GameInstanceCardProps {
  game: LobbyGame;
  onRegister: (gameId: string) => void;
  registering: boolean;
}

/** Map game status to display label and color */
function getStatusBadge(status: LobbyGame['status']) {
  switch (status) {
    case 'open':
      return { label: 'Open', className: 'bg-green-600 text-white' };
    case 'full':
      return { label: 'Full', className: 'bg-yellow-600 text-white' };
    case 'in_progress':
      return { label: 'In Progress', className: 'bg-blue-600 text-white' };
    case 'completed':
      return { label: 'Completed', className: 'bg-gray-600 text-white' };
    default:
      return { label: status, className: 'bg-gray-600 text-white' };
  }
}

/**
 * Card component for a single game instance in the lobby.
 * Shows game name, buy-in, player count, format, status badge, and register button.
 * Satisfies Requirements 2.2, 2.5, 3.1, 13.1 (touch targets).
 */
export function GameInstanceCard({ game, onRegister, registering }: GameInstanceCardProps) {
  const playerCount = game.registeredPlayers.length;
  const isFull = playerCount >= game.maxPlayers;
  const isOpen = game.status === 'open';
  const canRegister = isOpen && !isFull;
  const badge = getStatusBadge(game.status);

  return (
    <div className="bg-poker-dark border border-gray-700 rounded-lg p-4 flex flex-col gap-3 shadow-md hover:border-poker-gold transition-colors">
      {/* Header: game name + status badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-100 truncate">
          {game.name}
        </h3>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badge.className}`}
          aria-label={`Status: ${badge.label}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Game details */}
      <div className="flex flex-col gap-1 text-sm text-gray-300">
        <div className="flex justify-between">
          <span>Format</span>
          <span className="text-gray-100">Texas Hold&apos;em</span>
        </div>
        <div className="flex justify-between">
          <span>Buy-in</span>
          <span className="text-poker-gold font-medium">$1</span>
        </div>
        <div className="flex justify-between">
          <span>Players</span>
          <span className="text-gray-100">
            {playerCount}/{game.maxPlayers}
          </span>
        </div>
      </div>

      {/* Register button — min 44x44px touch target */}
      <button
        type="button"
        onClick={() => onRegister(game.id)}
        disabled={!canRegister || registering}
        className={`mt-auto min-h-[44px] min-w-[44px] w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-poker-gold focus:ring-offset-2 focus:ring-offset-poker-dark ${
          canRegister
            ? 'bg-poker-gold text-poker-dark hover:bg-yellow-500 active:bg-yellow-600'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
        aria-label={canRegister ? `Register for ${game.name}` : `Cannot register for ${game.name}`}
      >
        {registering ? 'Registering…' : canRegister ? 'Register — $1' : isFull ? 'Game Full' : 'Unavailable'}
      </button>
    </div>
  );
}
