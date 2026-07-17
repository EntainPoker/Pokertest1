import { useState, useCallback, useRef, useEffect } from 'react';
import type { HandState, PlayerAction, Card as CardType, Tournament } from '@spin-and-go/shared';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { ActionPanel } from './ActionPanel';
import { Card } from '../shared/Card';
import { LastHandSummary } from '../history/LastHandSummary';
import { getSocket } from '../../services/socket';
import { useGameStore } from '../../stores/gameStore';
import { getPositionLabels } from '../../services/positionLabels';

interface ShowdownResult {
  winnerId: string;
  amount: number;
  handName?: string;
  bestCards?: CardType[];
}

/** Check if two cards match (same rank and suit) */
function cardsMatch(a: CardType, b: CardType): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

/** Determine which community card indices are part of the best 5 winning cards */
function getHighlightedCommunityIndices(bestCards: CardType[], communityCards: CardType[]): Set<number> {
  const highlighted = new Set<number>();
  const usedBestIndices = new Set<number>();

  for (let ci = 0; ci < communityCards.length; ci++) {
    for (let bi = 0; bi < bestCards.length; bi++) {
      if (!usedBestIndices.has(bi) && cardsMatch(communityCards[ci], bestCards[bi])) {
        highlighted.add(ci);
        usedBestIndices.add(bi);
        break;
      }
    }
  }
  return highlighted;
}

/** Determine which of a player's hole cards are part of the best 5 winning cards */
function getHighlightedHoleCards(bestCards: CardType[], holeCards: CardType[], communityCards: CardType[]): Set<number> {
  // First figure out which bestCards are accounted for by community cards
  const usedBestIndices = new Set<number>();
  for (let ci = 0; ci < communityCards.length; ci++) {
    for (let bi = 0; bi < bestCards.length; bi++) {
      if (!usedBestIndices.has(bi) && cardsMatch(communityCards[ci], bestCards[bi])) {
        usedBestIndices.add(bi);
        break;
      }
    }
  }

  // Remaining bestCards must come from hole cards
  const highlighted = new Set<number>();
  for (let bi = 0; bi < bestCards.length; bi++) {
    if (usedBestIndices.has(bi)) continue;
    for (let hi = 0; hi < holeCards.length; hi++) {
      if (!highlighted.has(hi) && cardsMatch(holeCards[hi], bestCards[bi])) {
        highlighted.add(hi);
        break;
      }
    }
  }
  return highlighted;
}

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
 * Layout: Cards ABOVE player name pills, oval table with 3D felt edge.
 *
 * Satisfies Requirements 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 13.1.
 */
export function PokerTable({ handState, currentPlayerId, gameId, turnTimeRemaining = 30, tournament, tableTheme, onBackToLobby, onShowTournament }: PokerTableProps) {
  const { players = [], communityCards = [], pot = 0, sidePots = [], dealerPosition = 0, currentPlayerIndex = 0 } = handState || {};
  const [showLastHand, setShowLastHand] = useState(false);
  const myHoleCards = useGameStore((s) => s.myHoleCards);

  // Theme color classes for the oval table surface (bright green felt interior)
  const themeClasses: Record<string, string> = {
    'classic-green': 'from-green-500 via-green-600 to-green-700',
    'dark-blue': 'from-blue-700 via-blue-800 to-blue-900',
    'red-velvet': 'from-red-700 via-red-800 to-red-900',
    'midnight-purple': 'from-purple-700 via-purple-800 to-purple-900',
    'pink-felt': 'from-pink-500 via-pink-600 to-pink-700',
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

    // Detect winner from showdownResults (Rule 234-235)
    const showdownResults = (handState as any)?.showdownResults as ShowdownResult[] | undefined;
    if (showdownResults && showdownResults.length > 0) {
      const newActions: Record<string, string> = {};
      for (const result of showdownResults) {
        const handLabel = result.handName ? ` — ${result.handName}` : '';
        newActions[result.winnerId] = `WINS $${result.amount}${handLabel}`;
      }
      setPlayerActions(newActions);
    } else if (prevPot > 0 && pot === 0 && prevPlayers.length > 0) {
      // Fallback: detect winner from chip increase
      const newActions: Record<string, string> = {};
      for (const p of players) {
        const prev = prevPlayers.find(pp => pp.playerId === p.playerId);
        if (prev && p.chipCount > prev.chipCount) {
          const winAmount = p.chipCount - prev.chipCount;
          newActions[p.playerId] = `WINS $${winAmount}`;
        }
      }
      if (Object.keys(newActions).length > 0) {
        setPlayerActions(newActions);
      }
    }

    // Use server-provided action text (accurate, no guessing) during non-showdown
    if (handState?.bettingRound !== 'showdown' && handState?.lastActionText && handState?.lastActionPlayerId) {
      setPlayerActions(prev => ({
        ...prev,
        [handState.lastActionPlayerId!]: handState.lastActionText!,
      }));
    }

    prevPlayersRef.current = players;
    prevPotRef.current = pot;
  }, [players, pot, handState?.lastActionText, handState?.lastActionPlayerId, handState?.bettingRound]);

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

    // Only show hero's own cards during normal play
    if (player.playerId === currentPlayerId) {
      return myHoleCards;
    }

    // Opponents: ONLY show at showdown if they haven't folded (Rule 16, 221)
    if (handState?.bettingRound === 'showdown' && player.status !== 'folded' && player.holeCards && player.holeCards.length > 0) {
      return player.holeCards;
    }

    // All other cases: opponent cards hidden
    return [];
  };

  /** Check if a player's cards should be shown face-up */
  const shouldShowCards = (index: number): boolean => {
    const player = players[index];
    if (!player) return false;

    // Hero always sees their own cards
    if (player.playerId === currentPlayerId) return true;

    // Opponents: only face-up at showdown if not folded
    if (handState?.bettingRound === 'showdown' && player.status !== 'folded' && player.holeCards && player.holeCards.length > 0) {
      return true;
    }

    return false;
  };

  // Index-based layout: separate top opponents from bottom (hero)
  const myIndex = players.findIndex(p => p.playerId === currentPlayerId);
  const topIndices = players.map((_, idx) => idx).filter(idx => idx !== myIndex);
  const bottomIndex = myIndex >= 0 ? myIndex : players.length - 1;

  // Blind info for header
  const currentBlindLevel = tournament?.blindSchedule?.[Math.max(0, (tournament?.currentBlindLevel ?? 1) - 1)] ?? null;
  const nextBlindLevel = tournament?.blindSchedule?.[tournament?.currentBlindLevel ?? 0] ?? null;

  // Position labels (BTN, SB, BB, UTG, etc.) — Rule 19, 83
  const positionLabels = getPositionLabels(
    players.length,
    dealerPosition,
    handState?.smallBlindPosition ?? (dealerPosition + 1) % players.length,
    handState?.bigBlindPosition ?? (dealerPosition + 2) % players.length
  );

  // Avatar color helper
  const avatarColors = [
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
    'from-emerald-500 to-emerald-700',
    'from-rose-500 to-rose-700',
    'from-amber-500 to-amber-700',
    'from-cyan-500 to-cyan-700',
  ];

  const getAvatarGradient = (username: string) => {
    const colorIndex = username.charCodeAt(0) % avatarColors.length;
    return avatarColors[colorIndex];
  };

  const heroPlayer = players[bottomIndex];
  const heroActionText = heroPlayer ? playerActions[heroPlayer.playerId] : undefined;
  const heroIsWinner = heroActionText?.startsWith('WINS');

  // Showdown highlighting: determine which cards to highlight / dim
  const showdownResults = (handState as any)?.showdownResults as ShowdownResult[] | undefined;
  const isShowdown = handState?.bettingRound === 'showdown';
  const winnerIds = new Set(showdownResults?.map(r => r.winnerId) ?? []);
  const winnerBestCards = showdownResults?.find(r => r.bestCards && r.bestCards.length > 0)?.bestCards ?? [];

  // Community card highlighted indices (which board cards are in the best 5)
  const highlightedCommunityIndices = isShowdown && winnerBestCards.length > 0
    ? getHighlightedCommunityIndices(winnerBestCards, communityCards)
    : undefined;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ZONE 1: Header Bar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700/50 min-h-[44px]">
        {/* Left: Back to lobby */}
        <button
          type="button"
          onClick={onBackToLobby}
          className="text-xs sm:text-sm text-gray-300 hover:text-white transition-colors"
        >
          ← Lobby
        </button>

        {/* Center: Blind level info */}
        <div className="flex items-center text-[10px] sm:text-xs text-gray-300 font-medium">
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

        {/* Right: History + Tourney buttons */}
        <div className="flex items-center gap-2">
          {gameId && (
            <button
              onClick={() => setShowLastHand(true)}
              className="text-[10px] sm:text-xs text-gray-400 hover:text-white transition-colors"
              aria-label="View last hand history"
            >
              History
            </button>
          )}
          {tournament && onShowTournament && (
            <button
              type="button"
              onClick={onShowTournament}
              className="text-[10px] sm:text-xs text-poker-gold border border-poker-gold/40 px-2 py-0.5 rounded hover:bg-poker-gold/10 transition-colors"
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

      {/* ZONE 2: Table Area — 3 stacked sections: Opponent / Table Oval / Hero */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-between bg-gray-900 px-3 py-1 relative">

        {/* Win notification — above everything */}
        {handState?.bettingRound === 'showdown' && Object.keys(playerActions).some(id => playerActions[id]?.startsWith('WINS')) && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 z-30">
            {Object.entries(playerActions).filter(([, action]) => action?.startsWith('WINS')).map(([playerId, action]) => {
              const winPlayer = players.find(p => p.playerId === playerId);
              return (
                <div key={playerId} className="bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 font-black text-sm sm:text-base px-4 py-2 rounded-xl shadow-2xl text-center animate-bounce">
                  🏆 {winPlayer?.username || 'Player'} {action}
                </div>
              );
            })}
          </div>
        )}

        {/* === OPPONENT SECTION — positioned around the table === */}
        {/* For 2-handed: single opponent at top */}
        {/* For 3+: opponents spread left, top, right */}
        <div className={`shrink-0 w-full max-w-xl lg:max-w-2xl mx-auto ${topIndices.length === 1 ? 'flex justify-center' : topIndices.length === 2 ? 'flex justify-between px-4' : 'flex justify-between px-2'} pt-1`}>
          {topIndices.map((idx) => {
            const p = players[idx];
            if (!p) return null;
            const isFolded = p.status === 'folded';
            const actionText = playerActions[p.playerId];
            const isWinner = actionText?.startsWith('WINS');
            const opponentCards = getHoleCards(idx);
            const showFaceUp = shouldShowCards(idx);

            // Showdown card styling
            const isLoser = isShowdown && !isFolded && !winnerIds.has(p.playerId) && winnerIds.size > 0;
            const highlightedHoleIndices = isShowdown && isWinner && winnerBestCards.length > 0 && opponentCards.length > 0
              ? getHighlightedHoleCards(winnerBestCards, opponentCards, communityCards)
              : undefined;

            return (
              <div key={p.playerId} className={`flex flex-col items-center ${isFolded ? 'opacity-40 grayscale' : ''}`}>
                {/* Opponent hole cards */}
                <div className="flex mb-1">
                  {showFaceUp && opponentCards.length > 0 ? (
                    opponentCards.map((card, i) => (
                      <div key={i} className={`${i === 1 ? '-ml-4' : ''}`}>
                        <Card rank={card.rank} suit={card.suit} highlighted={highlightedHoleIndices?.has(i)} dimmed={isLoser} />
                      </div>
                    ))
                  ) : !isFolded ? (
                    <>
                      <div className="-rotate-3"><Card faceDown /></div>
                      <div className="-ml-4 rotate-3"><Card faceDown /></div>
                    </>
                  ) : null}
                </div>

                {/* Name pill + avatar */}
                <div className="flex items-center gap-1">
                  <div className={`bg-gray-900/90 border rounded-full px-2 py-0.5 shadow-lg flex items-center gap-1 ${
                    isWinner ? 'border-yellow-400/70' : currentPlayerIndex === idx ? 'border-poker-gold/70' : 'border-gray-700'
                  }`}>
                    {positionLabels.get(idx) && (
                      <span className={`text-[6px] sm:text-[7px] font-bold px-0.5 py-0.5 rounded ${
                        positionLabels.get(idx) === 'BTN' ? 'bg-white text-gray-900' :
                        positionLabels.get(idx) === 'SB' ? 'bg-blue-600/80 text-white' :
                        positionLabels.get(idx) === 'BB' ? 'bg-orange-600/80 text-white' :
                        'bg-gray-700/80 text-gray-300'
                      }`}>{positionLabels.get(idx)}</span>
                    )}
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-[9px] sm:text-[10px] text-gray-100 font-medium truncate max-w-[48px]">{p.username}</span>
                      <span className="text-[9px] sm:text-[10px] text-poker-gold font-bold">${p.chipCount}</span>
                    </div>
                    {actionText && !isWinner && (
                      <span className="text-[6px] sm:text-[7px] font-bold text-amber-300 bg-gray-800 px-0.5 py-0.5 rounded-sm">{actionText}</span>
                    )}
                  </div>
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white font-bold text-[10px] sm:text-xs shadow-md bg-gradient-to-br ${getAvatarGradient(p.username)} ${
                    currentPlayerIndex === idx ? 'ring-2 ring-poker-gold animate-pulse' : 'ring-1 ring-gray-600/50'
                  }`}>{p.username.charAt(0).toUpperCase()}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* === TABLE OVAL — bigger, contains pot + community cards + bet chips === */}
        <div className={`relative w-full max-w-xl lg:max-w-2xl flex-1 min-h-0 flex flex-col items-center justify-center rounded-[50%/42%] bg-gradient-to-br ${tableColorClass} shadow-[inset_0_2px_20px_rgba(0,0,0,0.3),0_8px_32px_rgba(0,0,0,0.6)] overflow-visible`}>
          <div className="absolute inset-0 rounded-[50%/42%] border-[6px] sm:border-[8px] border-gray-800 shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)] pointer-events-none" />
          <div className="absolute inset-[8px] sm:inset-[10px] rounded-[50%/42%] border border-green-400/15 pointer-events-none" />
          <div className="absolute inset-0 rounded-[50%/42%] bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />

          {/* Opponent bet chips — top area of table, below opponent */}
          {topIndices.map((idx) => {
            const p = players[idx];
            if (!p || !p.currentBet || p.currentBet <= 0) return null;
            return (
              <div key={`bet-${p.playerId}`} className="absolute top-[18%] left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
                <div className="relative flex">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-2 border-amber-700 shadow-md" />
                  {p.currentBet >= 50 && <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-red-400 to-red-600 border-2 border-red-800 shadow-md -ml-2" />}
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-white bg-gray-900/70 px-1.5 py-0.5 rounded">${p.currentBet}</span>
              </div>
            );
          })}

          {/* Center content: pot + community cards */}
          <div className="flex flex-col items-center gap-2 z-10">
            <PotDisplay amount={safePot} sidePots={safeSidePots} />
            <CommunityCards cards={communityCards} highlightedIndices={highlightedCommunityIndices} />
          </div>

          {/* Hero bet chips — bottom area of table, above hero */}
          {heroPlayer && typeof heroPlayer.currentBet === 'number' && heroPlayer.currentBet > 0 && (
            <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
              <div className="relative flex">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-2 border-amber-700 shadow-md" />
                {heroPlayer.currentBet >= 50 && <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-red-400 to-red-600 border-2 border-red-800 shadow-md -ml-2" />}
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-white bg-gray-900/70 px-1.5 py-0.5 rounded">${heroPlayer.currentBet}</span>
            </div>
          )}
        </div>

        {/* === HERO SECTION — at the very BOTTOM, BELOW the table === */}
        {heroPlayer && (
          <div className="shrink-0 flex flex-col items-center pb-1">
            {/* Hero hole cards — large */}
            <div className="flex mb-1">
              {(() => {
                const heroCards = getHoleCards(bottomIndex);
                const heroIsLoser = isShowdown && !winnerIds.has(heroPlayer.playerId) && winnerIds.size > 0 && heroPlayer.status !== 'folded';
                const heroHighlightedIndices = isShowdown && heroIsWinner && winnerBestCards.length > 0 && heroCards.length > 0
                  ? getHighlightedHoleCards(winnerBestCards, heroCards, communityCards)
                  : undefined;

                if (heroCards.length > 0) {
                  return heroCards.map((card, i) => (
                    <div key={i} className={`${i === 1 ? '-ml-4 sm:-ml-5' : ''}`}>
                      <div className="scale-110 sm:scale-125 origin-bottom">
                        <Card rank={card.rank} suit={card.suit} highlighted={heroHighlightedIndices?.has(i)} dimmed={heroIsLoser} />
                      </div>
                    </div>
                  ));
                } else if (!heroPlayer.status?.includes('folded')) {
                  return (
                    <>
                      <div className="scale-110 sm:scale-125 origin-bottom"><Card faceDown /></div>
                      <div className="-ml-4 sm:-ml-5 scale-110 sm:scale-125 origin-bottom"><Card faceDown /></div>
                    </>
                  );
                }
                return null;
              })()}
            </div>

            {/* Avatar + Name pill */}
            <div className="flex items-center gap-1.5">
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg bg-gradient-to-br ${getAvatarGradient(heroPlayer.username)} ${
                currentPlayerIndex === bottomIndex ? 'ring-2 ring-poker-gold' : 'ring-2 ring-gray-600/50'
              }`}>{heroPlayer.username.charAt(0).toUpperCase()}</div>

              <div className={`bg-gray-900/90 border rounded-full px-3 py-1 shadow-lg flex items-center gap-1.5 ${
                heroIsWinner ? 'border-yellow-400/70' : currentPlayerIndex === bottomIndex ? 'border-poker-gold/70' : 'border-gray-700'
              }`}>
                {positionLabels.get(bottomIndex) && (
                  <span className={`text-[7px] sm:text-[8px] font-bold px-1 py-0.5 rounded ${
                    positionLabels.get(bottomIndex) === 'BTN' ? 'bg-white text-gray-900' :
                    positionLabels.get(bottomIndex) === 'SB' ? 'bg-blue-600/80 text-white' :
                    positionLabels.get(bottomIndex) === 'BB' ? 'bg-orange-600/80 text-white' :
                    'bg-gray-700/80 text-gray-300'
                  }`}>{positionLabels.get(bottomIndex)}</span>
                )}
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[10px] sm:text-xs text-gray-100 font-medium truncate max-w-[64px]">{heroPlayer.username}</span>
                  <span className="text-[10px] sm:text-xs text-poker-gold font-bold">${heroPlayer.chipCount}</span>
                </div>
                {heroActionText && !heroIsWinner && (
                  <span className="text-[7px] sm:text-[8px] font-bold text-amber-300 bg-gray-800 px-1 py-0.5 rounded-sm">{heroActionText}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ZONE 3: Betting controls (handled by ActionPanel) */}
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
