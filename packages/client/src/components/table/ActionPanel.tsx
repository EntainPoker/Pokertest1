import { useState, useCallback, useMemo, useEffect } from 'react';
import type { HandState, PlayerAction } from '@spin-and-go/shared';
import { useTurnTimer } from '../../hooks/useTurnTimer';
import { useGameStore } from '../../stores/gameStore';

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
 * Action panel with countdown timer, quick bet buttons, and slider.
 * Returns null when it's not the current player's turn.
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

  // Get the reset key from store — increments on every new turn
  const turnResetKey = useGameStore((s) => s.turnResetKey);

  // Use the turn timer hook for proper countdown
  // Always start at 15 when this component renders (it only renders on our turn)
  const { secondsLeft } = useTurnTimer({
    timeRemaining: 15, // Always 15 seconds per action
    onExpire: onTurnExpire || (() => {}),
    isActive: isMyTurn,
    resetKey: turnResetKey,
  });

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

  // Bet/Raise minimum: always the big blind for a new betting round
  // For raises: currentBet + minRaise increment (which equals last raise size)
  const betMin = useMemo(() => {
    if (!myPlayer) return 0;
    if (validActions.bet) {
      // Preflop BB option: can raise from current bet
      if (handState.bettingRound === 'preflop' && (myPlayer.currentBet || 0) >= currentBet && currentBet > 0) {
        return currentBet + (minRaise || currentBet);
      }
      // Standard bet: minimum is the big blind (minRaise at start of a new round)
      const bigBlind = handState.minRaise || 20;
      return bigBlind;
    }
    if (validActions.raise) {
      // Min raise = current bet + last raise increment (stored in minRaise)
      return currentBet + minRaise;
    }
    return 0;
  }, [myPlayer, validActions, currentBet, minRaise, handState.minRaise, handState.bettingRound]);

  const betMax = myPlayer ? myPlayer.chipCount + (myPlayer.currentBet || 0) : 0;

  const [betAmount, setBetAmount] = useState(betMin);

  // CRITICAL FIX: Reset betAmount to the minimum when betMin changes
  // This ensures after a street change, the default goes back to min bet (big blind)
  useEffect(() => {
    setBetAmount(betMin);
  }, [betMin]);

  // Also clamp if out of bounds
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

  // Quick bet presets
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

  // Timer progress (percentage remaining)
  const timerMax = handState.turnTimeoutSeconds || 15;
  const timerProgress = Math.max(0, Math.min(100, (secondsLeft / timerMax) * 100));
  const isTimerUrgent = secondsLeft <= 5 && secondsLeft > 0;

  // Don't render if it's not the player's turn OR if it's showdown
  if (!isMyTurn || !myPlayer || myPlayer.status !== 'active' || handState.bettingRound === 'showdown') {
    return null;
  }

  // Determine which buttons to show — always 3 columns
  const canAffordMinRaise = myPlayer.chipCount >= (betMin - (myPlayer.currentBet || 0));
  const effectiveBetAmount = Math.min(betAmount, myPlayer.chipCount + (myPlayer.currentBet || 0));
  const isAllInBet = effectiveBetAmount >= myPlayer.chipCount + (myPlayer.currentBet || 0);

  const leftLabel = 'Fold';
  const middleLabel = validActions.call ? `Call $${callAmount}` : 'Check';
  
  let rightLabel: string;
  let handleRight: () => void;
  
  if (validActions.raise) {
    if (isAllInBet || !canAffordMinRaise) {
      rightLabel = `All-In $${myPlayer.chipCount}`;
      handleRight = handleAllIn;
    } else {
      rightLabel = `Raise $${effectiveBetAmount}`;
      handleRight = handleRaise;
    }
  } else if (validActions.bet) {
    if (isAllInBet) {
      rightLabel = `All-In $${myPlayer.chipCount}`;
      handleRight = handleAllIn;
    } else if (handState.bettingRound === 'preflop' && (myPlayer.currentBet || 0) >= currentBet && currentBet > 0) {
      rightLabel = `Raise $${effectiveBetAmount}`;
      handleRight = handleRaise;
    } else {
      rightLabel = `Bet $${effectiveBetAmount}`;
      handleRight = handleBet;
    }
  } else {
    rightLabel = `All-In $${myPlayer.chipCount}`;
    handleRight = handleAllIn;
  }

  const handleLeft = handleFold;
  const handleMiddle = validActions.call ? handleCall : handleCheck;

  return (
    <div className="shrink-0 bg-gray-900 px-2 pt-1.5 pb-[env(safe-area-inset-bottom,4px)] border-t border-gray-700">
      {/* Turn timer — prominent countdown */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-lg font-bold tabular-nums ${isTimerUrgent ? 'text-red-500 animate-pulse' : 'text-poker-gold'}`}>
          {secondsLeft}s
        </span>
        <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isTimerUrgent ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-poker-gold to-amber-400'}`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      </div>

      {/* Quick bet buttons + Slider row — only show if bet/raise available */}
      {showAmountInput && (
        <div className="flex items-center gap-1.5 mb-1.5">
          {/* Quick bet buttons on the left */}
          <div className="flex flex-col gap-0.5 shrink-0">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setBetAmount(preset.amount)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                  betAmount === preset.amount
                    ? 'bg-poker-gold text-gray-900 border-poker-gold'
                    : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-poker-gold/50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Slider on the right (takes remaining space) */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
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
