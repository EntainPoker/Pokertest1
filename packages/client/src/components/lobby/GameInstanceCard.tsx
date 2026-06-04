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
      return { label: 'Open', dotClass: 'bg-green-400', className: 'text-green-400 bg-green-400/10 border-green-400/30' };
    case 'full':
      return { label: 'Full', dotClass: 'bg-amber-400', className: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
    case 'in_progress':
      return { label: 'In Progress', dotClass: 'bg-blue-400', className: 'text-blue-400 bg-blue-400/10 border-blue-400/30' };
    case 'completed':
      return { label: 'Completed', dotClass: 'bg-gray-400', className: 'text-gray-400 bg-gray-400/10 border-gray-400/30' };
    default:
      return { label: status, dotClass: 'bg-gray-400', className: 'text-gray-400 bg-gray-400/10 border-gray-400/30' };
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

  const formatLabel = game.maxPlayers === 2 ? 'Heads-Up' : `${game.maxPlayers}-Max`;
  const prizeMultiplier = game.buyIn * game.maxPlayers;

  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl p-5 flex flex-col gap-4 shadow-lg hover:border-poker-gold/50 hover:shadow-poker-gold/10 hover:shadow-xl transition-all duration-200">
      {/* Top row: format badge + status */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-700/50 text-gray-300 border border-gray-600/50">
          {formatLabel}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
          {badge.label}
        </span>
      </div>

      {/* Game name */}
      <h3 className="text-lg font-bold text-gray-100 truncate">{game.name}</h3>

      {/* Buy-in prominent display */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-poker-gold">${game.buyIn}</span>
        <span className="text-sm text-gray-400">buy-in</span>
      </div>

      {/* Prize pool */}
      <div className="bg-gray-800/50 rounded-xl px-3 py-2 border border-gray-700/30">
        <span className="text-xs text-gray-400 uppercase tracking-wide">Win Up To</span>
        <p className="text-lg font-bold text-white">${prizeMultiplier.toLocaleString()}</p>
      </div>

      {/* Player count progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Players</span>
          <span className="text-gray-200 font-medium">{playerCount}/{game.maxPlayers}</span>
        </div>
        <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-poker-gold to-yellow-400 rounded-full transition-all duration-300"
            style={{ width: `${(playerCount / game.maxPlayers) * 100}%` }}
          />
        </div>
      </div>

      {/* Insufficient balance warning */}
      {insufficientBalance && (
        <p className="text-xs text-red-400 bg-red-400/5 rounded-lg px-3 py-2 border border-red-400/20">
          Insufficient balance. You need ${game.buyIn} to register.
        </p>
      )}

      {/* Action button */}
      {canUnregister && (
        <button
          type="button"
          onClick={() => onUnregister(game.id)}
          disabled={registering}
          className="mt-auto min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-semibold text-red-400 border-2 border-red-400/50 bg-transparent hover:bg-red-400/10 active:bg-red-400/20 transition-all"
        >
          {registering ? 'Processing…' : 'Unregister'}
        </button>
      )}

      {canRegister && (
        <button
          type="button"
          onClick={() => onRegister(game.id)}
          disabled={registering}
          className="mt-auto min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:from-emerald-600 active:to-green-700 shadow-lg shadow-green-600/25 transition-all"
        >
          {registering ? 'Registering…' : `Register — $${game.buyIn}`}
        </button>
      )}

      {isFull && !isRegistered && (
        <button disabled className="mt-auto min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-semibold bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30">
          Game Full
        </button>
      )}

      {isFull && isRegistered && (
        <button disabled className="mt-auto min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-semibold bg-blue-600/20 text-blue-400 border border-blue-400/30 cursor-not-allowed">
          Waiting to start…
        </button>
      )}

      {insufficientBalance && !isRegistered && !isFull && (
        <button disabled className="mt-auto min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-semibold bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30">
          Insufficient Funds
        </button>
      )}
    </div>
  );
}
