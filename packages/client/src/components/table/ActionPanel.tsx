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
 * Player action panel displaying valid actions based on game state.
 * Shows Check, Bet, Call, Raise, Fold, and All-In buttons as appropriate.
 * Includes bet/raise amount input with slider and +/- buttons.
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
    const bigBlind = handState.players.length > 0 ? minRaise : 20; // fallback

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
      // Minimum bet is the big blind
      const bigBlind = handState.minRaise || 20;
      return bigBlind;
    }
    if (validActions.raise) {
      // Minimum raise: current bet + min raise increment
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

  // Don't render if it's not the player's turn
  if (!isMyTurn || !myPlayer || myPlayer.status !== 'active') {
    return null;
  }

  const showAmountInput = validActions.bet || validActions.raise;

  return (
    <div className="w-full max-w-lg mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-poker-dark/95 rounded-xl border border-gray-600 shadow-xl">
      {/* Turn timer */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-xs sm:text-sm text-gray-400">Your turn</span>
        <Timer
          seconds={turnTimeRemaining}
          onExpire={onTurnExpire}
          className="text-lg sm:text-xl"
        />
      </div>

      {/* Bet/Raise amount input */}
      {showAmountInput && (
        <div className="mb-3 px-1 sm:px-2">
          <div className="flex items-center gap-2 mb-2">
            {/* Minus button */}
            <button
              type="button"
              onClick={() => adjustBet(-minRaise)}
              className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-100 font-bold text-lg transition-colors"
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
                className="w-full min-h-[44px] text-center text-lg sm:text-xl font-bold bg-gray-800 border border-gray-600 rounded-lg text-gray-100 px-2 py-2 focus:outline-none focus:border-poker-gold"
                aria-label="Bet amount"
              />
            </div>

            {/* Plus button */}
            <button
              type="button"
              onClick={() => adjustBet(minRaise)}
              className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-100 font-bold text-lg transition-colors"
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
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-poker-gold"
            aria-label="Bet amount slider"
          />

          {/* Min/Max labels */}
          <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 mt-1">
            <span>Min: {betMin}</span>
            <span>Max: {betMax}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {validActions.check && (
          <button
            type="button"
            onClick={handleCheck}
            className="min-w-[44px] min-h-[44px] px-3 py-3 rounded-lg bg-green-700 hover:bg-green-600 active:bg-green-500 text-white font-semibold text-sm sm:text-base transition-colors shadow-md"
          >
            Check
          </button>
        )}

        {validActions.bet && (
          <button
            type="button"
            onClick={handleBet}
            className="min-w-[44px] min-h-[44px] px-3 py-3 rounded-lg bg-blue-700 hover:bg-blue-600 active:bg-blue-500 text-white font-semibold text-sm sm:text-base transition-colors shadow-md"
          >
            Bet {betAmount}
          </button>
        )}

        {validActions.call && (
          <button
            type="button"
            onClick={handleCall}
            className="min-w-[44px] min-h-[44px] px-3 py-3 rounded-lg bg-green-700 hover:bg-green-600 active:bg-green-500 text-white font-semibold text-sm sm:text-base transition-colors shadow-md"
          >
            Call {callAmount}
          </button>
        )}

        {validActions.raise && (
          <button
            type="button"
            onClick={handleRaise}
            className="min-w-[44px] min-h-[44px] px-3 py-3 rounded-lg bg-blue-700 hover:bg-blue-600 active:bg-blue-500 text-white font-semibold text-sm sm:text-base transition-colors shadow-md"
          >
            Raise {betAmount}
          </button>
        )}

        {validActions.allIn && (
          <button
            type="button"
            onClick={handleAllIn}
            className="min-w-[44px] min-h-[44px] px-3 py-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-400 text-white font-semibold text-sm sm:text-base transition-colors shadow-md"
          >
            All-In ({myPlayer.chipCount})
          </button>
        )}

        {validActions.fold && (
          <button
            type="button"
            onClick={handleFold}
            className="min-w-[44px] min-h-[44px] px-3 py-3 rounded-lg bg-red-700 hover:bg-red-600 active:bg-red-500 text-white font-semibold text-sm sm:text-base transition-colors shadow-md"
          >
            Fold
          </button>
        )}
      </div>
    </div>
  );
}
