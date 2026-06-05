import { useState, useCallback, useMemo, useEffect } from 'react';
import type { HandState, PlayerAction } from '@spin-and-go/shared';
import { Timer } from '../shared/Timer';

interface ActionPanelProps {
  /** Current hand state */
  handState: HandState;
  /** The current player's ID */
  currentPlayerId: string;
  /** Callback when player submits an action */
  onAction: (action: PlayerAction) => void;
  /** Seconds remaining for the turn (from server) */
  turnTimeRemaining: number;
  /** Callback when turn timer expires */
  onTurnExpire?: () => void;
}

/**
 * Ultra-compact mobile action panel — slider + 3 buttons.
 * No presets, no +/- buttons. ~120px max height when visible.
 * Returns null when it's not the current player's turn.
 * Satisfies Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 13.2.
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

  // Find the player's data
  const myPlayer = players.find((p) => p.playerId === currentPlayerId);

  // Determine valid actions
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

  // Bet/Raise amount state
  const betMin = useMemo(() => {
    if (!myPlayer) return 0;
    if (validActions.bet) {
      const bigBlind = handState.minRaise || 20;
      return bigBlind;
    }
    if (validActions.raise) {
      return currentBet + minRaise;
    }
    return 0;
  }, [myPlayer, validActions, currentBet, minRaise, handState.minRaise]);

  const betMax = myPlayer?.chipCount ?? 0;

  const [betAmount, setBetAmount] = useState(betMin);

  // Keep betAmount in valid range when min changes
  useEffect(() => {
    if (betAmount < betMin) setBetAmount(betMin);
    if (betAmount > betMax) setBetAmount(betMax);
  }, [betMin, betMax]);

  const callAmount = useMemo(() => {
    if (!myPlayer) return 0;
    return currentBet - myPlayer.currentBet;
  }, [myPlayer, currentBet]);

  const handleCheck = useCallback(() => {
    onAction({ type: 'check' });
  }, [onAction]);

  const handleBet = useCallback(() => {
    onAction({ type: 'bet', amount: betAmount });
  }, [onAction, betAmount]);

  const handleCall = useCallback(() => {
    onAction({ type: 'call' });
  }, [onAction]);

  const handleRaise = useCallback(() => {
    onAction({ type: 'raise', amount: betAmount });
  }, [onAction, betAmount]);

  const handleFold = useCallback(() => {
    onAction({ type: 'fold' });
  }, [onAction]);

  const handleAllIn = useCallback(() => {
    onAction({ type: 'all_in' });
  }, [onAction]);

  const adjustBet = useCallback(
    (delta: number) => {
      setBetAmount((prev) => {
        const next = prev + delta;
        return Math.max(betMin, Math.min(betMax, next));
      });
    },
    [betMin, betMax]
  );

  const showAmountInput = validActions.bet || validActions.raise;

  // Preset raise amounts (kept for hook ordering — not rendered)
  const presets = useMemo(() => {
    const base = validActions.raise ? currentBet : 0;
    const min = minRaise || 20;
    return [
      { label: 'Min', amount: betMin },
      { label: '2x', amount: Math.min(base + min * 2, betMax) },
      { label: '3x', amount: Math.min(base + min * 3, betMax) },
      { label: 'Pot', amount: Math.min(handState.pot + currentBet * 2, betMax) },
      { label: 'All-In', amount: betMax },
    ];
  }, [betMin, betMax, currentBet, minRaise, handState.pot, validActions.raise]);

  // Timer progress (percentage remaining)
  const timerMax = 30;
  const timerProgress = Math.max(0, Math.min(100, (turnTimeRemaining / timerMax) * 100));

  // Don't render if it's not the player's turn
  if (!isMyTurn || !myPlayer || myPlayer.status !== 'active') {
    return null;
  }

  // Determine which buttons to show — always 3 columns
  const leftLabel = 'Fold';
  const middleLabel = validActions.call ? `Call $${callAmount}` : 'Check';
  const rightLabel = validActions.raise
    ? `Raise $${betAmount}`
    : validActions.bet
    ? `Bet $${betAmount}`
    : `All-In $${myPlayer.chipCount}`;

  const handleLeft = handleFold;
  const handleMiddle = validActions.call ? handleCall : handleCheck;
  const handleRight = validActions.raise
    ? handleRaise
    : validActions.bet
    ? handleBet
    : handleAllIn;

  return (
    <div className="shrink-0 bg-gray-900 px-2 pt-1.5 pb-[env(safe-area-inset-bottom,4px)] border-t border-gray-700">
      {/* Slider row — only show if bet/raise available */}
      {showAmountInput && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-gray-400 shrink-0">${betMin}</span>
          <input
            type="range"
            min={betMin}
            max={betMax}
            value={betAmount}
            onChange={(e) => setBetAmount(parseInt(e.target.value, 10))}
            className="flex-1 h-2 accent-poker-gold bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-poker-gold [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:appearance-none"
            aria-label="Bet amount slider"
          />
          <span className="text-xs sm:text-sm text-poker-gold font-bold shrink-0">${betAmount}</span>
        </div>
      )}
      {/* Button row: 3 buttons, equal width */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={handleLeft}
          className="min-h-[44px] sm:min-h-[48px] rounded-lg bg-gray-800 border border-gray-600 text-red-400 font-bold text-xs sm:text-sm transition-all active:bg-gray-700"
        >
          {leftLabel}
        </button>
        <button
          type="button"
          onClick={handleMiddle}
          disabled={!validActions.check && !validActions.call}
          className="min-h-[44px] sm:min-h-[48px] rounded-lg bg-gradient-to-b from-green-600 to-green-700 text-white font-bold text-xs sm:text-sm transition-all active:from-green-500 active:to-green-600 disabled:opacity-40"
        >
          {middleLabel}
        </button>
        <button
          type="button"
          onClick={handleRight}
          disabled={!validActions.bet && !validActions.raise && !validActions.allIn}
          className="min-h-[44px] sm:min-h-[48px] rounded-lg bg-gradient-to-b from-amber-500 to-amber-600 text-gray-900 font-bold text-xs sm:text-sm transition-all active:from-amber-400 active:to-amber-500 disabled:opacity-40"
        >
          {rightLabel}
        </button>
      </div>
    </div>
  );
}
