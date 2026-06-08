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

  const gameType = (game as any).gameType || (game.maxPlayers === 2 ? 'heads-up' : 'spin-and-go');
  const formatLabel = gameType === 'tourney' ? 'TOURNEY' : gameType === 'heads-up' ? 'HEADS-UP' : `${game.maxPlayers}-MAX`;
  const prizeMultiplier = game.buyIn * game.maxPlayers;

  return (
    <div className="relative group bg-gradient-to-b from-gray-800/90 to-gray-900 border border-gray-700/40 rounded-2xl p-5 flex flex-col gap-4 shadow-xl hover:border-poker-gold/60 hover:shadow-poker-gold/15 hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Subtle top gradient glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-poker-gold/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Registered checkmark badge */}
      {isRegistered && (
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-green-500/20 border border-green-400/50 flex items-center justify-center">
          <span className="text-green-400 text-sm">✓</span>
        </div>
      )}

      {/* Top row: format badge + status */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-gray-700/60 text-gray-200 border border-gray-600/50 uppercase tracking-wide">
          {formatLabel}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dotClass} ${game.status === 'open' ? 'animate-pulse' : ''}`} />
          {badge.label}
        </span>
      </div>

      {/* Game name */}
      <h3 className="text-lg font-bold text-gray-100 truncate">{game.name}</h3>

      {/* Buy-in prominent display */}
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-extrabold text-poker-gold drop-shadow-sm">${game.buyIn}</span>
        <span className="text-sm text-gray-500 font-medium">buy-in</span>
      </div>

      {/* Prize pool */}
      <div className="bg-gradient-to-r from-gray-800/60 to-gray-900/60 rounded-xl px-4 py-3 border border-gray-700/30">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Win Up To</span>
        <p className="text-xl font-extrabold text-white mt-0.5">${prizeMultiplier.toLocaleString()}</p>
      </div>

      {/* Player count progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Players</span>
          <span className="text-gray-200 font-semibold">{playerCount}/{game.maxPlayers}</span>
        </div>
        <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700/30">
          <div
            className="h-full bg-gradient-to-r from-poker-gold via-yellow-400 to-amber-500 rounded-full transition-all duration-500 shadow-sm shadow-poker-gold/30"
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
          className="mt-auto min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-semibold text-red-400 border-2 border-red-400/40 bg-transparent hover:bg-red-400/10 active:bg-red-400/20 transition-all"
        >
          {registering ? 'Processing…' : 'Unregister'}
        </button>
      )}

      {canRegister && (
        <button
          type="button"
          onClick={() => onRegister(game.id)}
          disabled={registering}
          className="mt-auto min-h-[44px] w-full rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 bg-gradient-to-r from-poker-gold via-yellow-400 to-amber-500 hover:from-yellow-300 hover:via-yellow-400 hover:to-amber-400 active:from-yellow-500 active:to-amber-600 shadow-lg shadow-poker-gold/25 transition-all"
        >
          {registering ? 'Registering…' : `Register — $${game.buyIn}`}
        </button>
      )}

      {isFull && !isRegistered && (
        <button disabled className="mt-auto min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-semibold bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/30">
          Game Full
        </button>
      )}

      {isFull && isRegistered && (
        <button disabled className="mt-auto min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-semibold bg-blue-600/10 text-blue-400 border border-blue-400/30 cursor-not-allowed">
          Waiting to start…
        </button>
      )}

      {insufficientBalance && !isRegistered && !isFull && (
        <button disabled className="mt-auto min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-semibold bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/30">
          Insufficient Funds
        </button>
      )}
    </div>
  );
}
