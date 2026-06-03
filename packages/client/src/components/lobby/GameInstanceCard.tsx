import type { LobbyGame } from '../../stores/lobbyStore';
import { useAuthStore } from '../../stores/authStore';

interface GameInstanceCardProps {
  game: LobbyGame;
  currentPlayerId: string;
  onRegister: (gameId: string) => void;
  onUnregister: (gameId: string) => void;
  registering: boolean;
}

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

export function GameInstanceCard({ game, currentPlayerId, onRegister, onUnregister, registering }: GameInstanceCardProps) {
  const balance = useAuthStore((s) => s.player?.balance ?? 0);
  const playerCount = game.registeredPlayers.length;
  const isFull = playerCount >= game.maxPlayers;
  const isOpen = game.status === 'open';
  const isRegistered = game.registeredPlayers.includes(currentPlayerId);
  const canRegister = isOpen && !isFull && !isRegistered && balance >= game.buyIn;
  const canUnregister = isRegistered && !isFull && game.status !== 'in_progress';
  const insufficientBalance = isOpen && !isFull && !isRegistered && balance < game.buyIn;
  const badge = getStatusBadge(game.status);

  return (
    <div className="bg-poker-dark border border-gray-700 rounded-lg p-4 flex flex-col gap-3 shadow-md hover:border-poker-gold transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-100 truncate">{game.name}</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <div className="flex flex-col gap-1 text-sm text-gray-300">
        <div className="flex justify-between">
          <span>Format</span>
          <span className="text-gray-100">Texas Hold&apos;em</span>
        </div>
        <div className="flex justify-between">
          <span>Buy-in</span>
          <span className="text-poker-gold font-medium">${game.buyIn}</span>
        </div>
        <div className="flex justify-between">
          <span>Players</span>
          <span className="text-gray-100">{playerCount}/{game.maxPlayers}</span>
        </div>
      </div>

      {/* Insufficient balance warning */}
      {insufficientBalance && (
        <p className="text-xs text-red-400">Insufficient balance. You need ${game.buyIn} to register.</p>
      )}

      {/* Action button */}
      {canUnregister && (
        <button
          type="button"
          onClick={() => onUnregister(game.id)}
          disabled={registering}
          className="mt-auto min-h-[44px] w-full rounded-md px-4 py-2.5 text-sm font-semibold bg-red-700 text-white hover:bg-red-600 active:bg-red-500 transition-colors"
        >
          {registering ? 'Processing…' : 'Unregister'}
        </button>
      )}

      {canRegister && (
        <button
          type="button"
          onClick={() => onRegister(game.id)}
          disabled={registering}
          className="mt-auto min-h-[44px] w-full rounded-md px-4 py-2.5 text-sm font-semibold bg-green-600 text-white hover:bg-green-500 active:bg-green-700 transition-colors"
        >
          {registering ? 'Registering…' : `Register — $${game.buyIn}`}
        </button>
      )}

      {isFull && !isRegistered && (
        <button disabled className="mt-auto min-h-[44px] w-full rounded-md px-4 py-2.5 text-sm font-semibold bg-gray-700 text-gray-400 cursor-not-allowed">
          Game Full
        </button>
      )}

      {isFull && isRegistered && (
        <button disabled className="mt-auto min-h-[44px] w-full rounded-md px-4 py-2.5 text-sm font-semibold bg-blue-700 text-white cursor-not-allowed">
          Waiting to start…
        </button>
      )}

      {insufficientBalance && !isRegistered && !isFull && (
        <button disabled className="mt-auto min-h-[44px] w-full rounded-md px-4 py-2.5 text-sm font-semibold bg-gray-700 text-gray-400 cursor-not-allowed">
          Insufficient Funds
        </button>
      )}
    </div>
  );
}
