import type { PlayerAction, HandPlayer, HandState } from '@spin-and-go/shared';

// ============================================================
// Types
// ============================================================

/** The set of actions available to a player */
export interface AvailableActions {
  canCheck: boolean;
  canBet: boolean;
  canCall: boolean;
  canRaise: boolean;
  canFold: boolean;
  canAllIn: boolean;
  /** Minimum bet amount (equal to big blind) */
  minBet: number;
  /** Maximum bet amount (player's remaining stack) */
  maxBet: number;
  /** Amount needed to call */
  callAmount: number;
  /** Minimum raise total (current bet + min raise increment) */
  minRaise: number;
  /** Maximum raise total (player's remaining stack) */
  maxRaise: number;
}

/** Result of processing a player action */
export interface ActionResult {
  success: boolean;
  error?: string;
  /** Updated player state after action */
  updatedPlayer?: HandPlayer;
  /** The validated action (may differ from input for all-in adjustments) */
  processedAction?: PlayerAction;
}

/** Validation error containing min/max info for user feedback */
export interface ActionValidationError {
  message: string;
  minAmount?: number;
  maxAmount?: number;
}

// ============================================================
// Action Validator
// ============================================================

/**
 * Determines which actions are valid for the current player based on game state.
 *
 * Rules:
 * - Check: available if no outstanding bet exists (currentBet === player's currentBet)
 * - Bet: available if no outstanding bet exists in this round (currentBet === 0)
 * - Call: available if an outstanding bet exists and player has sufficient chips
 * - Raise: available if an outstanding bet exists and player has chips above the call amount
 * - Fold: always available
 * - All-In: available if the player's remaining chips are less than the required call or min bet
 *
 * @param handState - The current hand state
 * @param playerIndex - Index of the player whose turn it is
 * @returns The set of available actions with amount constraints
 */
export function getAvailableActions(
  handState: HandState,
  playerIndex: number
): AvailableActions {
  const player = handState.players[playerIndex];

  if (!player || player.status !== 'active') {
    return {
      canCheck: false,
      canBet: false,
      canCall: false,
      canRaise: false,
      canFold: false,
      canAllIn: false,
      minBet: 0,
      maxBet: 0,
      callAmount: 0,
      minRaise: 0,
      maxRaise: 0,
    };
  }

  const currentBet = handState.currentBet;
  const playerBet = player.currentBet;
  const playerChips = player.chipCount;
  const bigBlind = handState.minRaise; // minRaise starts as big blind at round start
  const minRaiseIncrement = handState.minRaise;

  // Amount needed to match the current bet
  const callAmount = currentBet - playerBet;

  // Whether there's an outstanding bet the player must respond to
  const hasOutstandingBet = callAmount > 0;

  // Check: no outstanding bet
  const canCheck = !hasOutstandingBet;

  // Bet: no outstanding bet exists AND currentBet is 0 (fresh round, no blinds counted)
  const canBet = currentBet === 0;

  // Call: there's an outstanding bet and player can afford it
  const canCall = hasOutstandingBet && playerChips >= callAmount;

  // Raise: there's an outstanding bet and player has enough chips to raise above the call
  // Also allow raise when player has matched the current bet but it's > 0 (e.g., BB option preflop)
  const minRaiseTotal = currentBet + minRaiseIncrement;
  const chipsNeededToMinRaise = minRaiseTotal - playerBet;
  const canRaise = (hasOutstandingBet && playerChips > callAmount && playerChips >= chipsNeededToMinRaise)
    || (!hasOutstandingBet && currentBet > 0 && playerChips > 0); // BB option: can raise even though bet matches

  // Fold: always available when it's your turn
  const canFold = true;

  // All-In: available when player can't afford to call or min bet/raise
  // This is the player's only option when they don't have enough to call/bet normally
  const canAllIn =
    (hasOutstandingBet && playerChips < callAmount) ||
    (!hasOutstandingBet && playerChips < bigBlind) ||
    // Also available as an alternative to call/bet/raise (player can always go all-in)
    playerChips > 0;

  // Min bet is the big blind (or player's stack if less)
  const minBet = Math.min(bigBlind, playerChips);
  const maxBet = playerChips;

  // Min raise total amount
  const minRaise = Math.min(minRaiseTotal, playerChips + playerBet);
  const maxRaise = playerChips + playerBet;

  return {
    canCheck,
    canBet,
    canCall,
    canRaise,
    canFold,
    canAllIn,
    minBet,
    maxBet,
    callAmount,
    minRaise,
    maxRaise,
  };
}

// ============================================================
// Action Processor
// ============================================================

/**
 * Validates and processes a player action, updating the player's state.
 *
 * @param handState - The current hand state
 * @param playerIndex - Index of the acting player
 * @param action - The action to process
 * @returns The result containing updated player state or an error
 */
export function processPlayerAction(
  handState: HandState,
  playerIndex: number,
  action: PlayerAction
): ActionResult {
  const player = handState.players[playerIndex];

  if (!player) {
    return { success: false, error: 'Invalid player index' };
  }

  if (player.status !== 'active') {
    return { success: false, error: 'Player is not active' };
  }

  if (handState.currentPlayerIndex !== playerIndex) {
    return { success: false, error: 'It is not this player\'s turn' };
  }

  const available = getAvailableActions(handState, playerIndex);

  switch (action.type) {
    case 'check':
      return processCheck(player, available);
    case 'bet':
      return processBet(player, action.amount, available);
    case 'call':
      return processCall(player, available);
    case 'raise':
      return processRaise(player, action.amount, available);
    case 'fold':
      return processFold(player);
    case 'all_in':
      return processAllIn(player, handState);
    default:
      return { success: false, error: 'Unknown action type' };
  }
}

/**
 * Process a check action.
 * Player passes without placing a bet. Only valid if no outstanding bet.
 */
function processCheck(player: HandPlayer, available: AvailableActions): ActionResult {
  if (!available.canCheck) {
    return {
      success: false,
      error: 'Cannot check when there is an outstanding bet. You must call, raise, or fold.',
    };
  }

  const updatedPlayer: HandPlayer = {
    ...player,
    hasActed: true,
  };

  return {
    success: true,
    updatedPlayer,
    processedAction: { type: 'check' },
  };
}

/**
 * Process a bet action.
 * Validates amount is between min bet (big blind) and player's stack.
 */
function processBet(
  player: HandPlayer,
  amount: number,
  available: AvailableActions
): ActionResult {
  if (!available.canBet) {
    return {
      success: false,
      error: 'Cannot bet when there is already an outstanding bet. Use raise instead.',
    };
  }

  if (amount < available.minBet) {
    return {
      success: false,
      error: `Bet amount ${amount} is below the minimum of ${available.minBet}. Allowed range: ${available.minBet} to ${available.maxBet}.`,
    };
  }

  if (amount > available.maxBet) {
    return {
      success: false,
      error: `Bet amount ${amount} exceeds your remaining stack of ${available.maxBet}. Allowed range: ${available.minBet} to ${available.maxBet}.`,
    };
  }

  // If the player is betting their entire stack, treat as all-in
  if (amount === player.chipCount) {
    return processAllIn(player, undefined, amount);
  }

  const updatedPlayer: HandPlayer = {
    ...player,
    chipCount: player.chipCount - amount,
    currentBet: player.currentBet + amount,
    totalBetThisHand: player.totalBetThisHand + amount,
    hasActed: true,
  };

  return {
    success: true,
    updatedPlayer,
    processedAction: { type: 'bet', amount: updatedPlayer.currentBet },
  };
}

/**
 * Process a call action.
 * Player matches the current bet. If player doesn't have enough, they go all-in.
 */
function processCall(player: HandPlayer, available: AvailableActions): ActionResult {
  if (!available.canCall) {
    if (available.callAmount > player.chipCount) {
      // Player can't afford to call - should use all-in
      return {
        success: false,
        error: 'Insufficient chips to call. Use all-in instead.',
      };
    }
    return {
      success: false,
      error: 'Cannot call when there is no outstanding bet. Use check instead.',
    };
  }

  const callAmount = available.callAmount;

  const updatedPlayer: HandPlayer = {
    ...player,
    chipCount: player.chipCount - callAmount,
    currentBet: player.currentBet + callAmount,
    totalBetThisHand: player.totalBetThisHand + callAmount,
    hasActed: true,
  };

  return {
    success: true,
    updatedPlayer,
    processedAction: { type: 'call' },
  };
}

/**
 * Process a raise action.
 * Validates the raise total is at least the minimum raise and within the player's stack.
 */
function processRaise(
  player: HandPlayer,
  amount: number,
  available: AvailableActions
): ActionResult {
  if (!available.canRaise) {
    if (available.callAmount >= player.chipCount) {
      return {
        success: false,
        error: 'Insufficient chips to raise. You can call or go all-in.',
      };
    }
    return {
      success: false,
      error: 'Cannot raise when there is no outstanding bet. Use bet instead.',
    };
  }

  if (amount < available.minRaise) {
    return {
      success: false,
      error: `Raise amount ${amount} is below the minimum of ${available.minRaise}. Allowed range: ${available.minRaise} to ${available.maxRaise}.`,
    };
  }

  if (amount > available.maxRaise) {
    return {
      success: false,
      error: `Raise amount ${amount} exceeds the maximum of ${available.maxRaise}. Allowed range: ${available.minRaise} to ${available.maxRaise}.`,
    };
  }

  // The amount is the total raise to (e.g., raise to 60 means currentBet becomes 60)
  const additionalChips = amount - player.currentBet;

  // If raising to the full stack, treat as all-in
  if (additionalChips === player.chipCount) {
    return processAllIn(player, undefined, additionalChips);
  }

  const updatedPlayer: HandPlayer = {
    ...player,
    chipCount: player.chipCount - additionalChips,
    currentBet: amount,
    totalBetThisHand: player.totalBetThisHand + additionalChips,
    hasActed: true,
  };

  return {
    success: true,
    updatedPlayer,
    processedAction: { type: 'raise', amount },
  };
}

/**
 * Process a fold action.
 * Removes the player from the current hand.
 */
function processFold(player: HandPlayer): ActionResult {
  const updatedPlayer: HandPlayer = {
    ...player,
    status: 'folded',
    hasActed: true,
  };

  return {
    success: true,
    updatedPlayer,
    processedAction: { type: 'fold' },
  };
}

/**
 * Process an all-in action.
 * Player wagers their entire remaining stack.
 */
function processAllIn(
  player: HandPlayer,
  _handState?: HandState,
  chipAmount?: number
): ActionResult {
  const allInAmount = chipAmount ?? player.chipCount;

  const updatedPlayer: HandPlayer = {
    ...player,
    chipCount: 0,
    currentBet: player.currentBet + allInAmount,
    totalBetThisHand: player.totalBetThisHand + allInAmount,
    status: 'all_in',
    hasActed: true,
  };

  return {
    success: true,
    updatedPlayer,
    processedAction: { type: 'all_in' },
  };
}

// ============================================================
// Turn Timer
// ============================================================

/** Callback invoked when a turn timer expires */
export type TurnTimeoutCallback = (
  gameId: string,
  playerId: string
) => void;

/**
 * Manages the 30-second turn timer for player actions.
 * When the timer expires, the player is automatically folded.
 */
export class TurnTimer {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly timeoutSeconds: number;
  private readonly onTimeout: TurnTimeoutCallback;

  constructor(timeoutSeconds: number = 30, onTimeout: TurnTimeoutCallback) {
    this.timeoutSeconds = timeoutSeconds;
    this.onTimeout = onTimeout;
  }

  /**
   * Starts a turn timer for the given player in the given game.
   * If a timer is already running for that game, it is cancelled first.
   *
   * @param gameId - The game/hand identifier
   * @param playerId - The player whose turn it is
   * @returns The timestamp when the turn started
   */
  startTimer(gameId: string, playerId: string): Date {
    // Cancel any existing timer for this game
    this.cancelTimer(gameId);

    const turnStartedAt = new Date();
    const timer = setTimeout(() => {
      this.timers.delete(gameId);
      this.onTimeout(gameId, playerId);
    }, this.timeoutSeconds * 1000);

    this.timers.set(gameId, timer);
    return turnStartedAt;
  }

  /**
   * Cancels the turn timer for the given game (player acted in time).
   */
  cancelTimer(gameId: string): void {
    const existing = this.timers.get(gameId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(gameId);
    }
  }

  /**
   * Returns the remaining time in seconds for the given game's timer.
   * Returns 0 if no timer is active.
   */
  getRemainingTime(gameId: string, turnStartedAt: Date): number {
    if (!this.timers.has(gameId)) {
      return 0;
    }
    const elapsed = (Date.now() - turnStartedAt.getTime()) / 1000;
    return Math.max(0, this.timeoutSeconds - elapsed);
  }

  /**
   * Returns whether a timer is currently active for the given game.
   */
  isActive(gameId: string): boolean {
    return this.timers.has(gameId);
  }

  /**
   * Cancels all active timers. Used for cleanup.
   */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  /**
   * Returns the configured timeout in seconds.
   */
  getTimeoutSeconds(): number {
    return this.timeoutSeconds;
  }
}
