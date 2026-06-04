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
 * Premium player action panel with preset raise buttons, large action buttons,
 * slider for custom amounts, and a timer countdown bar.
 * Only visible when it's the current player's turn.
 * All buttons have minimum 44x44px touch targets.
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

  // Preset raise amounts (must be above early return to respect hooks rule)
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

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-5 py-4 sm:py-5 bg-gray-900/95 backdrop-blur-md rounded-t-2xl border-t border-x border-gray-700/50 shadow-2xl">
      {/* Timer countdown bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs sm:text-sm font-bold text-poker-gold uppercase tracking-wide">Your Turn</span>
          <Timer
            seconds={turnTimeRemaining}
            onExpire={onTurnExpire}
            className="text-base sm:text-lg font-bold"
          />
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-poker-gold to-amber-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      </div>

      {/* Bet/Raise amount input */}
      {showAmountInput && (
        <div className="mb-4">
          {/* Preset raise pills */}
          <div className="flex gap-1.5 sm:gap-2 mb-3 overflow-x-auto pb-1">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setBetAmount(preset.amount)}
                className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  betAmount === preset.amount
                    ? 'bg-poker-gold/20 border-poker-gold/60 text-poker-gold border'
                    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-2">
            {/* Minus button */}
            <button
              type="button"
              onClick={() => adjustBet(-minRaise)}
              className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-600 active:bg-gray-600 text-gray-100 font-bold text-lg transition-all"
              aria-label="Decrease bet amount"
            >
              −
            </button>

            {/* Amount display */}
            <div className="flex-1 text-center">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setBetAmount(Math.max(betMin, Math.min(betMax, val)));
                  }
                }}
                min={betMin}
                max={betMax}
                className="w-full min-h-[44px] text-center text-lg sm:text-xl font-bold bg-gray-800 border border-gray-600 rounded-xl text-poker-gold px-2 py-2 focus:outline-none focus:border-poker-gold focus:ring-1 focus:ring-poker-gold/30 transition-all"
                aria-label="Bet amount"
              />
            </div>

            {/* Plus button */}
            <button
              type="button"
              onClick={() => adjustBet(minRaise)}
              className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-600 active:bg-gray-600 text-gray-100 font-bold text-lg transition-all"
              aria-label="Increase bet amount"
            >
              +
            </button>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={betMin}
            max={betMax}
            value={betAmount}
            onChange={(e) => setBetAmount(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-poker-gold"
            aria-label="Bet amount slider"
          />

          {/* Min/Max labels */}
          <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mt-1.5">
            <span>Min: ${betMin}</span>
            <span>Max: ${betMax}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {validActions.check && (
          <button
            type="button"
            onClick={handleCheck}
            className="min-w-[44px] min-h-[44px] px-4 py-3.5 rounded-xl bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 active:from-green-700 active:to-green-800 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-green-700/30"
          >
            Check
          </button>
        )}

        {validActions.call && (
          <button
            type="button"
            onClick={handleCall}
            className="min-w-[44px] min-h-[44px] px-4 py-3.5 rounded-xl bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 active:from-green-700 active:to-green-800 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-green-700/30"
          >
            Call ${callAmount}
          </button>
        )}

        {validActions.bet && (
          <button
            type="button"
            onClick={handleBet}
            className="min-w-[44px] min-h-[44px] px-4 py-3.5 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:from-blue-700 active:to-blue-800 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-blue-700/30"
          >
            Bet ${betAmount}
          </button>
        )}

        {validActions.raise && (
          <button
            type="button"
            onClick={handleRaise}
            className="min-w-[44px] min-h-[44px] px-4 py-3.5 rounded-xl bg-gradient-to-b from-poker-gold to-amber-600 hover:from-yellow-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-gray-900 font-bold text-sm sm:text-base transition-all shadow-lg shadow-poker-gold/30"
          >
            Raise ${betAmount}
          </button>
        )}

        {validActions.allIn && (
          <button
            type="button"
            onClick={handleAllIn}
            className="min-w-[44px] min-h-[44px] px-4 py-3.5 rounded-xl bg-gradient-to-b from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 active:from-amber-600 active:to-red-700 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-red-600/30 animate-pulse"
          >
            All-In ${myPlayer.chipCount}
          </button>
        )}

        {validActions.fold && (
          <button
            type="button"
            onClick={handleFold}
            className="min-w-[44px] min-h-[44px] px-4 py-3 rounded-xl bg-gray-800 border border-red-500/40 hover:bg-red-900/30 hover:border-red-500/60 active:bg-red-900/50 text-red-400 font-semibold text-sm sm:text-base transition-all"
          >
            Fold
          </button>
        )}
      </div>
    </div>
  );
}
