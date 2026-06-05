import { useState, useCallback, useMemo, useEffect } from 'react';
import type { HandState, PlayerAction } from '@spin-and-go/shared';
import { useTurnTimer } from '../../hooks/useTurnTimer';
import { useGameStore } from '../../stores/gameStore';

interface ActionPanelProps {
  handState: HandState;
  currentPlayerId: string;
  onAction: (action: PlayerAction) => void;
  turnTimeRemaining: number;
  onTurnExpire?: () => void;
}

/**
 * Redesigned action panel matching the mock:
 * - Timer circle bottom-left
 * - Slider + quick bets (1.5x, 2x, 3x) on a row
 * - 3 large action buttons (Fold / Check|Call / Bet|Raise)
 */
export function ActionPanel({
  handState,
  currentPlayerId,
  onAction,
  turnTimeRemaining,
  onTurnExpire,
}: ActionPanelProps) {
  const { players, currentPlayerIndex, currentBet, minRaise } = handState;
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.playerId === currentPlayerId;
  const myPlayer = players.find((p) => p.playerId === currentPlayerId);

  const turnResetKey = useGameStore((s) => s.turnResetKey);

  const { secondsLeft } = useTurnTimer({
    timeRemaining: 15,
    onExpire: onTurnExpire || (() => {}),
    isActive: isMyTurn,
    resetKey: turnResetKey,
  });

  // Valid actions
  const validActions = useMemo(() => {
    if (!myPlayer || !isMyTurn || myPlayer.status !== 'active') {
      return { check: false, bet: false, call: false, raise: false, fold: false, allIn: false };
    }
    const hasOutstandingBet = currentBet > myPlayer.currentBet;
    const amountToCall = currentBet - myPlayer.currentBet;
    const canAffordCall = myPlayer.chipCount >= amountToCall;
    return {
      check: !hasOutstandingBet,
      bet: !hasOutstandingBet && myPlayer.chipCount > 0,
      call: hasOutstandingBet && canAffordCall,
      raise: hasOutstandingBet && myPlayer.chipCount > amountToCall,
      fold: true,
      allIn: myPlayer.chipCount > 0 && (!canAffordCall || myPlayer.chipCount <= amountToCall),
    };
  }, [myPlayer, isMyTurn, currentBet, minRaise, handState.players.length]);

  // Bet min/max
  const betMin = useMemo(() => {
    if (!myPlayer) return 0;
    if (validActions.bet) {
      if (handState.bettingRound === 'preflop' && (myPlayer.currentBet || 0) >= currentBet && currentBet > 0) {
        return currentBet + (minRaise || currentBet);
      }
      return handState.minRaise || 20;
    }
    if (validActions.raise) return currentBet + minRaise;
    return 0;
  }, [myPlayer, validActions, currentBet, minRaise, handState.minRaise, handState.bettingRound]);

  const betMax = myPlayer ? myPlayer.chipCount + (myPlayer.currentBet || 0) : 0;
  const [betAmount, setBetAmount] = useState(betMin);

  useEffect(() => { setBetAmount(betMin); }, [betMin]);
  useEffect(() => {
    if (betAmount < betMin) setBetAmount(betMin);
    if (betAmount > betMax) setBetAmount(betMax);
  }, [betMin, betMax]);

  const callAmount = useMemo(() => {
    if (!myPlayer) return 0;
    return currentBet - myPlayer.currentBet;
  }, [myPlayer, currentBet]);

  // Action handlers
  const handleFold = useCallback(() => onAction({ type: 'fold' }), [onAction]);
  const handleCheck = useCallback(() => onAction({ type: 'check' }), [onAction]);
  const handleCall = useCallback(() => onAction({ type: 'call' }), [onAction]);
  const handleBet = useCallback(() => onAction({ type: 'bet', amount: betAmount }), [onAction, betAmount]);
  const handleRaise = useCallback(() => onAction({ type: 'raise', amount: betAmount }), [onAction, betAmount]);
  const handleAllIn = useCallback(() => onAction({ type: 'all_in' }), [onAction]);

  // Quick bets
  const presets = useMemo(() => {
    if (!myPlayer) return [];
    const base = validActions.raise ? currentBet : 0;
    const increment = minRaise || 20;
    return [
      { label: '1.5x', amount: Math.min(Math.round(base + increment * 1.5), betMax) },
      { label: '2x', amount: Math.min(base + increment * 2, betMax) },
      { label: '3x', amount: Math.min(base + increment * 3, betMax) },
    ];
  }, [betMin, betMax, currentBet, minRaise, validActions.raise, myPlayer]);

  const showAmountInput = validActions.bet || validActions.raise;

  // Don't render if not my turn or showdown
  if (!isMyTurn || !myPlayer || myPlayer.status !== 'active' || handState.bettingRound === 'showdown') {
    return null;
  }

  // Button config
  const canAffordMinRaise = myPlayer.chipCount >= (betMin - (myPlayer.currentBet || 0));
  const effectiveBetAmount = Math.min(betAmount, myPlayer.chipCount + (myPlayer.currentBet || 0));
  const isAllInBet = effectiveBetAmount >= myPlayer.chipCount + (myPlayer.currentBet || 0);

  // Middle button
  const middleLabel = validActions.call ? `CALL $${callAmount}` : 'CHECK';
  const handleMiddle = validActions.call ? handleCall : handleCheck;

  // Right button
  let rightLabel: string;
  let handleRight: () => void;
  if (validActions.raise) {
    if (isAllInBet || !canAffordMinRaise) {
      rightLabel = `ALL-IN $${myPlayer.chipCount}`;
      handleRight = handleAllIn;
    } else {
      rightLabel = `RAISE $${effectiveBetAmount}`;
      handleRight = handleRaise;
    }
  } else if (validActions.bet) {
    if (isAllInBet) {
      rightLabel = `ALL-IN $${myPlayer.chipCount}`;
      handleRight = handleAllIn;
    } else if (handState.bettingRound === 'preflop' && (myPlayer.currentBet || 0) >= currentBet && currentBet > 0) {
      rightLabel = `RAISE $${effectiveBetAmount}`;
      handleRight = handleRaise;
    } else {
      rightLabel = `BET $${effectiveBetAmount}`;
      handleRight = handleBet;
    }
  } else {
    rightLabel = `ALL-IN $${myPlayer.chipCount}`;
    handleRight = handleAllIn;
  }

  // Timer color
  const isTimerUrgent = secondsLeft <= 5;

  return (
    <div className="shrink-0 bg-gray-950 border-t border-gray-800 px-3 pt-2 pb-[env(safe-area-inset-bottom,6px)]">
      {/* Row 1: Slider (60%) + Quick bets (40%) */}
      {showAmountInput && (
        <div className="flex items-center gap-3 mb-2">
          {/* Slider — 60% width */}
          <div className="flex items-center gap-2 flex-[3]">
            <span className="text-[10px] text-gray-500 shrink-0">${betMin}</span>
            <input
              type="range"
              min={betMin}
              max={betMax}
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 accent-poker-gold bg-gray-700 rounded-full appearance-none cursor-pointer"
              aria-label="Bet amount slider"
            />
            <span className="text-xs text-poker-gold font-bold shrink-0">${betAmount}</span>
          </div>
          {/* Quick bets — 40% width */}
          <div className="flex gap-1.5 flex-[2] justify-end">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setBetAmount(p.amount)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  betAmount === p.amount
                    ? 'bg-poker-gold text-gray-900'
                    : 'bg-gray-800 text-gray-300 border border-gray-600 hover:border-poker-gold/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Row 2: Timer circle + 3 action buttons */}
      <div className="flex items-center gap-2">
        {/* Timer circle — bottom left */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shrink-0 font-bold text-sm tabular-nums ${
          isTimerUrgent
            ? 'border-red-500 text-red-500 animate-pulse bg-red-500/10'
            : 'border-gray-600 text-white bg-gray-800'
        }`}>
          {secondsLeft}
        </div>

        {/* 3 action buttons — fill remaining space */}
        <div className="flex-1 grid grid-cols-3 gap-2">
          {/* FOLD */}
          <button
            type="button"
            onClick={handleFold}
            className="min-h-[52px] rounded-lg bg-gradient-to-b from-red-700 to-red-900 border border-red-600 text-white font-black text-sm sm:text-base tracking-wide transition-all active:from-red-600 active:to-red-800 shadow-lg"
          >
            FOLD
          </button>

          {/* CHECK / CALL */}
          <button
            type="button"
            onClick={handleMiddle}
            disabled={!validActions.check && !validActions.call}
            className="min-h-[52px] rounded-lg bg-gradient-to-b from-green-600 to-green-800 border border-green-500 text-white font-black text-sm sm:text-base tracking-wide transition-all active:from-green-500 active:to-green-700 disabled:opacity-40 shadow-lg"
          >
            {middleLabel}
          </button>

          {/* BET / RAISE / ALL-IN */}
          <button
            type="button"
            onClick={handleRight}
            disabled={!validActions.bet && !validActions.raise && !validActions.allIn}
            className="min-h-[52px] rounded-lg bg-gradient-to-b from-amber-500 to-amber-700 border border-amber-400 text-gray-900 font-black text-sm sm:text-base tracking-wide transition-all active:from-amber-400 active:to-amber-600 disabled:opacity-40 shadow-lg"
          >
            {rightLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
