import { useState, useCallback, useRef, useEffect } from 'react';
import type { HandState, PlayerAction, Card as CardType, Tournament } from '@spin-and-go/shared';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { ActionPanel } from './ActionPanel';
import { Card } from '../shared/Card';
import { LastHandSummary } from '../history/LastHandSummary';
import { getSocket } from '../../services/socket';
import { useGameStore } from '../../stores/gameStore';
import { getPositionLabels } from '../../services/positionLabels';

interface PokerTableProps {
  handState: HandState;
  currentPlayerId: string;
  gameId?: string;
  /** Turn time remaining in seconds (from game state) */
  turnTimeRemaining?: number;
  /** Tournament data for the header */
  tournament?: Tournament;
  /** Table theme (gradient color scheme) */
  tableTheme?: string;
  /** Navigate back to lobby */
  onBackToLobby?: () => void;
  /** Show tournament lobby overlay */
  onShowTournament?: () => void;
}

/**
 * Main poker table layout — mobile-first, fits 100dvh with no scroll.
 * Three-zone layout: Header, Table area, Betting controls.
 *
 * Satisfies Requirements 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 13.1.
 */
export function PokerTable({ handState, currentPlayerId, gameId, turnTimeRemaining = 30, tournament, tableTheme, onBackToLobby, onShowTournament }: PokerTableProps) {
  const { players = [], communityCards = [], pot = 0, sidePots = [], dealerPosition = 0, currentPlayerIndex = 0 } = handState || {};
  const [showLastHand, setShowLastHand] = useState(false);
  const myHoleCards = useGameStore((s) => s.myHoleCards);

  // Theme color classes for the oval table surface
  const themeClasses: Record<string, string> = {
    'classic-green': 'from-green-600 via-green-700 to-green-800',
    'dark-blue': 'from-blue-800 via-blue-900 to-blue-950',
    'red-velvet': 'from-red-800 via-red-900 to-red-950',
    'midnight-purple': 'from-purple-800 via-purple-900 to-purple-950',
    'pink-felt': 'from-pink-600 via-pink-700 to-pink-800',
  };
  const tableColorClass = themeClasses[tableTheme || 'classic-green'] || themeClasses['classic-green'];

  // Track last action per player for action badge display
  const [playerActions, setPlayerActions] = useState<Record<string, string>>({});
  const prevPlayersRef = useRef<typeof players>([]);
  const prevPotRef = useRef<number>(0);

  // Detect actions and winners from state changes — use server-provided lastActionText
  useEffect(() => {
    const prevPlayers = prevPlayersRef.current;
    const prevPot = prevPotRef.current;

    // Detect winner: pot went to 0 and a player's chips increased
    if (prevPot > 0 && pot === 0 && prevPlayers.length > 0) {
      const newActions: Record<string, string> = {};
      for (const p of players) {
        const prev = prevPlayers.find(pp => pp.playerId === p.playerId);
        if (prev && p.chipCount > prev.chipCount) {
          newActions[p.playerId] = '__WINNER__';
        }
      }
      if (Object.keys(newActions).length > 0) {
        setPlayerActions(newActions);
      }
    }

    // Use server-provided action text (accurate, no guessing)
    if (handState?.lastActionText && handState?.lastActionPlayerId) {
      setPlayerActions(prev => ({
        ...prev,
        [handState.lastActionPlayerId!]: handState.lastActionText!,
      }));
    }

    prevPlayersRef.current = players;
    prevPotRef.current = pot;
  }, [players, pot, handState?.lastActionText, handState?.lastActionPlayerId]);

  // Ensure pot is always a number (never an object) to prevent React Error #300
  const safePot = typeof pot === 'number' && !isNaN(pot) ? pot : 0;
  const safeSidePots = Array.isArray(sidePots) ? sidePots : [];

  /** Emit player action via WebSocket */
  const handleAction = useCallback((action: PlayerAction) => {
    const socket = getSocket();
    socket.emit('game:action', { gameId, playerId: currentPlayerId, action });
  }, [gameId, currentPlayerId]);

  // Safety: if players array is empty or invalid, show loading state
  if (!players || players.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading table...</p>
      </div>
    );
  }

  /** Get the hole cards to display for a given player index */
  const getHoleCards = (index: number): CardType[] => {
    const player = players[index];
    if (!player) return [];
    if (player.playerId === currentPlayerId) {
      return myHoleCards;
    }
    // At showdown, show opponent cards if server provided them
    if (handState?.bettingRound === 'showdown' && player.holeCards && player.holeCards.length > 0) {
      return player.holeCards;
    }
    return [];
  };

  /** Check if a player's cards should be shown face-up */
  const shouldShowCards = (index: number): boolean => {
    const player = players[index];
    if (!player) return false;
    if (player.playerId === currentPlayerId) return true;
    // Show opponent cards at showdown if they have cards
    if (handState?.bettingRound === 'showdown' && player.holeCards && player.holeCards.length > 0 && player.status !== 'folded') {
      return true;
    }
    return false;
  };

  // Simple index-based layout: separate top opponents from bottom (current) player
  const myIndex = players.findIndex(p => p.playerId === currentPlayerId);

  // Top row: all players except the current player
  const topIndices = players
    .map((_, idx) => idx)
    .filter(idx => idx !== myIndex);

  // Bottom player: the current player (or fallback to last player if not found)
  const bottomIndex = myIndex >= 0 ? myIndex : players.length - 1;

  // Blind info for header
  const currentBlindLevel = tournament?.blindSchedule?.[Math.max(0, (tournament?.currentBlindLevel ?? 1) - 1)] ?? null;
  const nextBlindLevel = tournament?.blindSchedule?.[tournament?.currentBlindLevel ?? 0] ?? null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ZONE 1: Header — compact single row ~50px */}
      <div className="shrink-0 flex items-center justify-between px-2 py-1 bg-gray-800 border-b border-gray-700 max-h-[50px]">
        {/* Left: Back to lobby */}
        <button
          type="button"
          onClick={onBackToLobby}
          className="text-[11px] text-gray-300 hover:text-white px-1.5 py-1 rounded"
        >
          ← Lobby
        </button>

        {/* Center: Blind info */}
        <div className="flex items-center gap-1 text-[10px] text-gray-300">
          {currentBlindLevel ? (
            <span>
              Lvl {currentBlindLevel.level} • {currentBlindLevel.smallBlind}/{currentBlindLevel.bigBlind}
              {turnTimeRemaining !== undefined && <span> • {turnTimeRemaining}s</span>}
              {nextBlindLevel && <span> • Next: {nextBlindLevel.smallBlind}/{nextBlindLevel.bigBlind}</span>}
            </span>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </div>

        {/* Right: Tournament button + Last Hand */}
        <div className="flex items-center gap-1">
          {gameId && (
            <button
              onClick={() => setShowLastHand(true)}
              className="text-[10px] text-gray-400 hover:text-white px-1 py-0.5 rounded"
              aria-label="View last hand history"
            >
              History
            </button>
          )}
          {tournament && onShowTournament && (
            <button
              type="button"
              onClick={onShowTournament}
              className="text-[10px] text-poker-gold border border-poker-gold/40 px-1.5 py-0.5 rounded hover:bg-poker-gold/10"
              aria-label="Open tournament lobby"
            >
              Tourney
            </button>
          )}
        </div>
      </div>

      {/* Last Hand overlay */}
      {showLastHand && gameId && (
        <LastHandSummary gameId={gameId} onClose={() => setShowLastHand(false)} />
      )}

      {/* ZONE 2: Table area — fills remaining space, oval poker table */}
      <div className="flex-1 min-h-0 flex flex-col justify-center items-center bg-gradient-to-b from-gray-800 via-stone-900 to-gray-950 px-2 py-1">
        {/* Oval table surface */}
        <div className={`w-full max-w-lg flex-1 min-h-0 flex flex-col justify-between items-center rounded-[50%/40%] bg-gradient-to-br ${tableColorClass} border-[5px] border-gray-900 shadow-2xl px-4 py-3 relative overflow-hidden`}>
          {/* Subtle inner felt edge */}
          <div className="absolute inset-2 rounded-[50%/40%] border border-green-500/20 pointer-events-none" />

          {/* Top: Opponents */}
          <div className={`flex ${topIndices.length === 1 ? 'justify-center' : 'justify-center gap-3'} w-full z-10`}>
            {topIndices.map((idx) => {
              const p = players[idx];
              if (!p) return null;
              return (
                <PlayerSeat
                  key={p.playerId}
                  player={p}
                  isActive={currentPlayerIndex === idx}
                  isDealer={dealerPosition === idx}
                  showCards={shouldShowCards(idx)}
                  holeCards={getHoleCards(idx)}
                  lastAction={playerActions[p.playerId] === '__WINNER__' ? undefined : playerActions[p.playerId]}
                  isWinner={playerActions[p.playerId] === '__WINNER__'}
                />
              );
            })}
          </div>

          {/* Middle: Pot + Community cards */}
          <div className="flex flex-col items-center gap-2 z-10">
            <PotDisplay amount={safePot} sidePots={safeSidePots} />
            <CommunityCards cards={communityCards} />
          </div>

          {/* Bottom: My avatar + my cards */}
          <div className="flex items-center justify-center gap-3 pb-1 z-10">
            {players[bottomIndex] && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  {dealerPosition === bottomIndex && (
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white text-gray-900 text-[8px] sm:text-[9px] font-black flex items-center justify-center shadow-md border border-gray-300 mb-0.5">D</span>
                  )}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg bg-gradient-to-br from-blue-500 to-blue-700 ${currentPlayerIndex === bottomIndex ? 'ring-2 ring-poker-gold' : 'ring-2 ring-gray-600/50'}`}>
                    {players[bottomIndex].username.charAt(0).toUpperCase()}
                  </div>
                  {/* Name badge */}
                  <div className="bg-gray-900/90 border border-gray-700 rounded px-2 py-0.5 mt-0.5 shadow-md">
                    <span className="text-xs sm:text-sm text-gray-100 block text-center">{players[bottomIndex].username}</span>
                    <span className="text-xs sm:text-sm text-poker-gold font-bold block text-center">${players[bottomIndex].chipCount}</span>
                  </div>
                </div>
                {/* My hole cards — larger for visibility */}
                <div className="flex gap-1">
                  {getHoleCards(bottomIndex).length > 0
                    ? getHoleCards(bottomIndex).map((card, i) => (
                        <Card key={i} rank={card.rank} suit={card.suit} />
                      ))
                    : !players[bottomIndex].status?.includes('folded') && (
                        <>
                          <Card faceDown />
                          <Card faceDown />
                        </>
                      )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ZONE 3: Betting controls */}
      <div className="shrink-0 w-full">
        <ActionPanel
          handState={handState}
          currentPlayerId={currentPlayerId}
          onAction={handleAction}
          turnTimeRemaining={turnTimeRemaining}
        />
      </div>
    </div>
  );
}
