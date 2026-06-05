import { useState, useCallback } from 'react';
import type { HandState, PlayerAction, Card as CardType, Tournament } from '@spin-and-go/shared';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { ActionPanel } from './ActionPanel';
import { Card } from '../shared/Card';
import { LastHandSummary } from '../history/LastHandSummary';
import { getSocket } from '../../services/socket';
import { useGameStore } from '../../stores/gameStore';

interface PokerTableProps {
  handState: HandState;
  currentPlayerId: string;
  gameId?: string;
  /** Turn time remaining in seconds (from game state) */
  turnTimeRemaining?: number;
  /** Tournament data for the header */
  tournament?: Tournament;
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
export function PokerTable({ handState, currentPlayerId, gameId, turnTimeRemaining = 30, tournament, onBackToLobby, onShowTournament }: PokerTableProps) {
  const { players = [], communityCards = [], pot = 0, sidePots = [], dealerPosition = 0, currentPlayerIndex = 0 } = handState || {};
  const [showLastHand, setShowLastHand] = useState(false);
  const myHoleCards = useGameStore((s) => s.myHoleCards);

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
    return [];
  };

  /** Check if a player's cards should be shown face-up */
  const shouldShowCards = (index: number): boolean => {
    const player = players[index];
    if (!player) return false;
    return player.playerId === currentPlayerId;
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

      {/* ZONE 2: Table area — fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col justify-between bg-gradient-to-b from-green-900 via-emerald-900 to-green-950 px-2 py-1">
        {/* Top: Opponents */}
        <div className={`flex ${topIndices.length === 1 ? 'justify-center' : 'justify-center gap-2'} w-full`}>
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
              />
            );
          })}
        </div>

        {/* Middle: Pot + Community cards */}
        <div className="flex flex-col items-center gap-1">
          <PotDisplay amount={safePot} sidePots={safeSidePots} />
          <CommunityCards cards={communityCards} />
        </div>

        {/* Bottom: My avatar + my cards */}
        <div className="flex items-center justify-center gap-2 pb-1">
          {players[bottomIndex] && (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                {dealerPosition === bottomIndex && (
                  <span className="w-3.5 h-3.5 rounded-full bg-white text-gray-900 text-[7px] font-black flex items-center justify-center shadow-sm border border-gray-300 mb-0.5">D</span>
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md bg-gradient-to-br from-blue-500 to-blue-700 ${currentPlayerIndex === bottomIndex ? 'ring-2 ring-poker-gold' : 'ring-1 ring-gray-600/50'}`}>
                  {players[bottomIndex].username.charAt(0).toUpperCase()}
                </div>
                <span className="text-[8px] text-gray-300 mt-0.5">{players[bottomIndex].username}</span>
                <span className="text-[9px] text-poker-gold font-bold">${players[bottomIndex].chipCount}</span>
              </div>
              {/* My hole cards — larger for visibility */}
              <div className="flex gap-0.5 [&>div]:w-10 [&>div]:h-14 [&>div]:text-xs">
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
