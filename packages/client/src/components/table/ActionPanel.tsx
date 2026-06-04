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
 * Compact mobile-first action panel — GGPoker-style.
 * Single row of action buttons at bottom, raise presets as horizontal scroll above.
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
    <div className="w-full max-w-lg mx-auto px-3 py-3 bg-gray-900/98 backdrop-blur-md rounded-t-2xl border-t border-x border-gray-700/50 shadow-2xl">
      {/* Timer countdown bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-poker-gold">Your turn</span>
          <Timer
            seconds={turnTimeRemaining}
            onExpire={onTurnExpire}
            className="text-sm font-bold"
          />
        </div>
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-poker-gold to-amber-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      </div>

      {/* Bet/Raise amount input — condensed */}
      {showAmountInput && (
        <div className="mb-2">
          {/* Preset raise pills — horizontal scrollable row */}
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 scrollbar-none">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setBetAmount(preset.amount)}
                className={`min-w-[44px] min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                  betAmount === preset.amount
                    ? 'bg-poker-gold/20 border-poker-gold/60 text-poker-gold border'
                    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Compact slider + amount row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustBet(-minRaise)}
              className="min-w-[44px] min-h-[44px] w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 border border-gray-700 text-gray-100 font-bold text-sm transition-all"
              aria-label="Decrease bet amount"
            >
              −
            </button>

            <div className="flex-1 flex flex-col gap-1">
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
                className="w-full min-h-[44px] text-center text-base font-bold bg-gray-800 border border-gray-600 rounded-lg text-poker-gold px-2 py-1.5 focus:outline-none focus:border-poker-gold transition-all"
                aria-label="Bet amount"
              />
              <input
                type="range"
                min={betMin}
                max={betMax}
                value={betAmount}
                onChange={(e) => setBetAmount(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-poker-gold"
                aria-label="Bet amount slider"
              />
            </div>

            <button
              type="button"
              onClick={() => adjustBet(minRaise)}
              className="min-w-[44px] min-h-[44px] w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 border border-gray-700 text-gray-100 font-bold text-sm transition-all"
              aria-label="Increase bet amount"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Action buttons — single row */}
      <div className="flex gap-2">
        {validActions.fold && (
          <button
            type="button"
            onClick={handleFold}
            className="min-w-[44px] min-h-[44px] flex-1 px-3 py-3 rounded-xl bg-gray-800 border border-red-500/40 hover:bg-red-900/30 text-red-400 font-semibold text-sm transition-all"
          >
            Fold
          </button>
        )}

        {validActions.check && (
          <button
            type="button"
            onClick={handleCheck}
            className="min-w-[44px] min-h-[44px] flex-1 px-3 py-3 rounded-xl bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold text-sm transition-all shadow-md"
          >
            Check
          </button>
        )}

        {validActions.call && (
          <button
            type="button"
            onClick={handleCall}
            className="min-w-[44px] min-h-[44px] flex-1 px-3 py-3 rounded-xl bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold text-sm transition-all shadow-md"
          >
            {`Call $${callAmount}`}
          </button>
        )}

        {validActions.bet && (
          <button
            type="button"
            onClick={handleBet}
            className="min-w-[44px] min-h-[44px] flex-1 px-3 py-3 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm transition-all shadow-md"
          >
            {`Bet $${betAmount}`}
          </button>
        )}

        {validActions.raise && (
          <button
            type="button"
            onClick={handleRaise}
            className="min-w-[44px] min-h-[44px] flex-1 px-3 py-3 rounded-xl bg-gradient-to-b from-poker-gold to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-gray-900 font-bold text-sm transition-all shadow-md"
          >
            Raise ${betAmount}
          </button>
        )}

        {validActions.allIn && (
          <button
            type="button"
            onClick={handleAllIn}
            className="min-w-[44px] min-h-[44px] flex-1 px-3 py-3 rounded-xl bg-gradient-to-b from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-sm transition-all shadow-md animate-pulse"
          >
            All-In ${myPlayer.chipCount}
          </button>
        )}
      </div>
    </div>
  );
}
