import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAvailableActions,
  processPlayerAction,
  TurnTimer,
} from './actionProcessor.js';
import type { HandState, HandPlayer } from '@spin-and-go/shared';

// ============================================================
// Test Helpers
// ============================================================

function makePlayer(overrides: Partial<HandPlayer> = {}): HandPlayer {
  return {
    playerId: 'player-1',
    username: 'TestPlayer',
    holeCards: [],
    chipCount: 500,
    currentBet: 0,
    totalBetThisHand: 0,
    status: 'active',
    hasActed: false,
    ...overrides,
  };
}

function makeHandState(overrides: Partial<HandState> = {}): HandState {
  return {
    id: 'hand-1',
    tournamentId: 'tournament-1',
    handNumber: 1,
    dealerPosition: 0,
    smallBlindPosition: 1,
    bigBlindPosition: 2,
    communityCards: [],
    pot: 30,
    sidePots: [],
    players: [
      makePlayer({ playerId: 'player-0', username: 'Player0', chipCount: 490, currentBet: 0 }),
      makePlayer({ playerId: 'player-1', username: 'Player1', chipCount: 490, currentBet: 10, totalBetThisHand: 10 }),
      makePlayer({ playerId: 'player-2', username: 'Player2', chipCount: 480, currentBet: 20, totalBetThisHand: 20 }),
    ],
    currentPlayerIndex: 0,
    bettingRound: 'preflop',
    currentBet: 20,
    minRaise: 20,
    lastAction: null,
    turnStartedAt: new Date(),
    turnTimeoutSeconds: 30,
    ...overrides,
  };
}

// ============================================================
// getAvailableActions Tests
// ============================================================

describe('getAvailableActions', () => {
  describe('when there is no outstanding bet', () => {
    it('should allow check and bet but not call or raise', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const actions = getAvailableActions(state, 0);

      expect(actions.canCheck).toBe(true);
      expect(actions.canBet).toBe(true);
      expect(actions.canCall).toBe(false);
      expect(actions.canRaise).toBe(false);
      expect(actions.canFold).toBe(true);
      expect(actions.canAllIn).toBe(true);
    });

    it('should set minBet to big blind', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const actions = getAvailableActions(state, 0);
      expect(actions.minBet).toBe(20);
      expect(actions.maxBet).toBe(500);
    });
  });

  describe('when there is an outstanding bet', () => {
    it('should allow call and raise but not check or bet', () => {
      const state = makeHandState({
        currentBet: 20,
        minRaise: 20,
        currentPlayerIndex: 0,
      });

      const actions = getAvailableActions(state, 0);

      expect(actions.canCheck).toBe(false);
      expect(actions.canBet).toBe(false);
      expect(actions.canCall).toBe(true);
      expect(actions.canRaise).toBe(true);
      expect(actions.canFold).toBe(true);
    });

    it('should calculate correct call amount', () => {
      const state = makeHandState({
        currentBet: 40,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 460, currentBet: 40, totalBetThisHand: 40 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const actions = getAvailableActions(state, 0);
      expect(actions.callAmount).toBe(40);
    });

    it('should calculate correct min raise', () => {
      const state = makeHandState({
        currentBet: 40,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 460, currentBet: 40, totalBetThisHand: 40 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const actions = getAvailableActions(state, 0);
      // Min raise total = currentBet + minRaiseIncrement = 40 + 20 = 60
      expect(actions.minRaise).toBe(60);
      expect(actions.maxRaise).toBe(500); // playerChips + playerBet = 500 + 0
    });
  });

  describe('when player has insufficient chips', () => {
    it('should not allow call when chips are less than call amount', () => {
      const state = makeHandState({
        currentBet: 100,
        minRaise: 50,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 30, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 400, currentBet: 100 }),
          makePlayer({ playerId: 'p2', chipCount: 400, currentBet: 100 }),
        ],
        currentPlayerIndex: 0,
      });

      const actions = getAvailableActions(state, 0);
      expect(actions.canCall).toBe(false);
      expect(actions.canRaise).toBe(false);
      expect(actions.canAllIn).toBe(true);
    });

    it('should allow all-in when chips are less than big blind for bet', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 15, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const actions = getAvailableActions(state, 0);
      expect(actions.canAllIn).toBe(true);
      expect(actions.minBet).toBe(15); // Capped at player's stack
    });
  });

  describe('edge cases', () => {
    it('should return no actions for a folded player', () => {
      const state = makeHandState({
        players: [
          makePlayer({ playerId: 'p0', status: 'folded' }),
          makePlayer({ playerId: 'p1', chipCount: 500 }),
          makePlayer({ playerId: 'p2', chipCount: 500 }),
        ],
        currentPlayerIndex: 0,
      });

      const actions = getAvailableActions(state, 0);
      expect(actions.canCheck).toBe(false);
      expect(actions.canBet).toBe(false);
      expect(actions.canCall).toBe(false);
      expect(actions.canRaise).toBe(false);
      expect(actions.canFold).toBe(false);
      expect(actions.canAllIn).toBe(false);
    });

    it('should return no actions for an all-in player', () => {
      const state = makeHandState({
        players: [
          makePlayer({ playerId: 'p0', status: 'all_in', chipCount: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500 }),
          makePlayer({ playerId: 'p2', chipCount: 500 }),
        ],
        currentPlayerIndex: 0,
      });

      const actions = getAvailableActions(state, 0);
      expect(actions.canCheck).toBe(false);
      expect(actions.canBet).toBe(false);
      expect(actions.canCall).toBe(false);
      expect(actions.canRaise).toBe(false);
      expect(actions.canFold).toBe(false);
      expect(actions.canAllIn).toBe(false);
    });

    it('should return no actions for an invalid player index', () => {
      const state = makeHandState();
      const actions = getAvailableActions(state, 99);
      expect(actions.canCheck).toBe(false);
      expect(actions.canFold).toBe(false);
    });
  });
});

// ============================================================
// processPlayerAction Tests
// ============================================================

describe('processPlayerAction', () => {
  describe('check', () => {
    it('should succeed when no outstanding bet', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'check' });

      expect(result.success).toBe(true);
      expect(result.updatedPlayer?.hasActed).toBe(true);
      expect(result.updatedPlayer?.chipCount).toBe(500);
      expect(result.processedAction).toEqual({ type: 'check' });
    });

    it('should fail when there is an outstanding bet', () => {
      const state = makeHandState({
        currentBet: 20,
        minRaise: 20,
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'check' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot check');
    });
  });

  describe('bet', () => {
    it('should succeed with valid amount', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'bet', amount: 50 });

      expect(result.success).toBe(true);
      expect(result.updatedPlayer?.chipCount).toBe(450);
      expect(result.updatedPlayer?.currentBet).toBe(50);
      expect(result.updatedPlayer?.totalBetThisHand).toBe(50);
      expect(result.updatedPlayer?.hasActed).toBe(true);
    });

    it('should fail when bet is below minimum (big blind)', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'bet', amount: 10 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('below the minimum');
      expect(result.error).toContain('20');
    });

    it('should fail when bet exceeds stack', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 100, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'bet', amount: 200 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should fail when there is already an outstanding bet', () => {
      const state = makeHandState({
        currentBet: 40,
        minRaise: 20,
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'bet', amount: 50 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot bet');
    });

    it('should treat betting entire stack as all-in', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 100, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'bet', amount: 100 });
      expect(result.success).toBe(true);
      expect(result.updatedPlayer?.status).toBe('all_in');
      expect(result.updatedPlayer?.chipCount).toBe(0);
      expect(result.processedAction?.type).toBe('all_in');
    });
  });

  describe('call', () => {
    it('should succeed and deduct correct amount', () => {
      const state = makeHandState({
        currentBet: 40,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 460, currentBet: 40, totalBetThisHand: 40 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'call' });

      expect(result.success).toBe(true);
      expect(result.updatedPlayer?.chipCount).toBe(460);
      expect(result.updatedPlayer?.currentBet).toBe(40);
      expect(result.updatedPlayer?.totalBetThisHand).toBe(40);
    });

    it('should fail when no outstanding bet', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'call' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('no outstanding bet');
    });

    it('should fail when player cannot afford to call', () => {
      const state = makeHandState({
        currentBet: 200,
        minRaise: 100,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 50, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 300, currentBet: 200 }),
          makePlayer({ playerId: 'p2', chipCount: 300, currentBet: 200 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'call' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient chips');
    });
  });

  describe('raise', () => {
    it('should succeed with valid raise amount', () => {
      const state = makeHandState({
        currentBet: 20,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 490, currentBet: 10, totalBetThisHand: 10 }),
          makePlayer({ playerId: 'p2', chipCount: 480, currentBet: 20, totalBetThisHand: 20 }),
        ],
        currentPlayerIndex: 0,
      });

      // Raise to 40 (current bet 20 + min raise increment 20)
      const result = processPlayerAction(state, 0, { type: 'raise', amount: 40 });

      expect(result.success).toBe(true);
      expect(result.updatedPlayer?.chipCount).toBe(460);
      expect(result.updatedPlayer?.currentBet).toBe(40);
      expect(result.updatedPlayer?.totalBetThisHand).toBe(40);
    });

    it('should fail when raise is below minimum', () => {
      const state = makeHandState({
        currentBet: 40,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 460, currentBet: 40, totalBetThisHand: 40 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      // Min raise should be 60 (40 + 20), trying to raise to 50
      const result = processPlayerAction(state, 0, { type: 'raise', amount: 50 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('below the minimum');
    });

    it('should fail when raise exceeds stack', () => {
      const state = makeHandState({
        currentBet: 40,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 100, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 460, currentBet: 40 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      // Max raise = chipCount + currentBet = 100 + 0 = 100
      const result = processPlayerAction(state, 0, { type: 'raise', amount: 150 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should fail when no outstanding bet', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'raise', amount: 40 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('no outstanding bet');
    });

    it('should treat raising to full stack as all-in', () => {
      const state = makeHandState({
        currentBet: 20,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 80, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 480, currentBet: 20, totalBetThisHand: 20 }),
          makePlayer({ playerId: 'p2', chipCount: 480, currentBet: 20, totalBetThisHand: 20 }),
        ],
        currentPlayerIndex: 0,
      });

      // Raise to 80 (player's full stack + currentBet of 0 = 80)
      const result = processPlayerAction(state, 0, { type: 'raise', amount: 80 });
      expect(result.success).toBe(true);
      expect(result.updatedPlayer?.status).toBe('all_in');
      expect(result.updatedPlayer?.chipCount).toBe(0);
    });
  });

  describe('fold', () => {
    it('should always succeed and change status to folded', () => {
      const state = makeHandState({ currentPlayerIndex: 0 });

      const result = processPlayerAction(state, 0, { type: 'fold' });

      expect(result.success).toBe(true);
      expect(result.updatedPlayer?.status).toBe('folded');
      expect(result.updatedPlayer?.hasActed).toBe(true);
      expect(result.processedAction).toEqual({ type: 'fold' });
    });

    it('should succeed even when there is no outstanding bet', () => {
      const state = makeHandState({
        currentBet: 0,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500, currentBet: 0 }),
          makePlayer({ playerId: 'p2', chipCount: 500, currentBet: 0 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'fold' });
      expect(result.success).toBe(true);
      expect(result.updatedPlayer?.status).toBe('folded');
    });
  });

  describe('all-in', () => {
    it('should wager entire remaining stack', () => {
      const state = makeHandState({
        currentBet: 100,
        minRaise: 50,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 75, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 400, currentBet: 100 }),
          makePlayer({ playerId: 'p2', chipCount: 400, currentBet: 100 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'all_in' });

      expect(result.success).toBe(true);
      expect(result.updatedPlayer?.chipCount).toBe(0);
      expect(result.updatedPlayer?.currentBet).toBe(75);
      expect(result.updatedPlayer?.totalBetThisHand).toBe(75);
      expect(result.updatedPlayer?.status).toBe('all_in');
      expect(result.processedAction).toEqual({ type: 'all_in' });
    });

    it('should work when player has enough to call but uses all-in', () => {
      const state = makeHandState({
        currentBet: 40,
        minRaise: 20,
        players: [
          makePlayer({ playerId: 'p0', chipCount: 200, currentBet: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 460, currentBet: 40 }),
          makePlayer({ playerId: 'p2', chipCount: 460, currentBet: 40 }),
        ],
        currentPlayerIndex: 0,
      });

      const result = processPlayerAction(state, 0, { type: 'all_in' });

      expect(result.success).toBe(true);
      expect(result.updatedPlayer?.chipCount).toBe(0);
      expect(result.updatedPlayer?.currentBet).toBe(200);
      expect(result.updatedPlayer?.status).toBe('all_in');
    });
  });

  describe('error cases', () => {
    it('should fail for invalid player index', () => {
      const state = makeHandState();
      const result = processPlayerAction(state, 99, { type: 'check' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid player index');
    });

    it('should fail if it is not the player\'s turn', () => {
      const state = makeHandState({ currentPlayerIndex: 1 });
      const result = processPlayerAction(state, 0, { type: 'check' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not this player\'s turn');
    });

    it('should fail for a folded player', () => {
      const state = makeHandState({
        currentPlayerIndex: 0,
        players: [
          makePlayer({ playerId: 'p0', status: 'folded' }),
          makePlayer({ playerId: 'p1', chipCount: 500 }),
          makePlayer({ playerId: 'p2', chipCount: 500 }),
        ],
      });

      const result = processPlayerAction(state, 0, { type: 'check' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
    });

    it('should fail for an all-in player', () => {
      const state = makeHandState({
        currentPlayerIndex: 0,
        players: [
          makePlayer({ playerId: 'p0', status: 'all_in', chipCount: 0 }),
          makePlayer({ playerId: 'p1', chipCount: 500 }),
          makePlayer({ playerId: 'p2', chipCount: 500 }),
        ],
      });

      const result = processPlayerAction(state, 0, { type: 'check' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
    });
  });
});

// ============================================================
// TurnTimer Tests
// ============================================================

describe('TurnTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call onTimeout after the specified duration', () => {
    const onTimeout = vi.fn();
    const timer = new TurnTimer(30, onTimeout);

    timer.startTimer('game-1', 'player-1');

    // Advance by 29 seconds - should not fire yet
    vi.advanceTimersByTime(29_000);
    expect(onTimeout).not.toHaveBeenCalled();

    // Advance by 1 more second - should fire
    vi.advanceTimersByTime(1_000);
    expect(onTimeout).toHaveBeenCalledWith('game-1', 'player-1');
    expect(onTimeout).toHaveBeenCalledTimes(1);

    timer.cancelAll();
  });

  it('should not call onTimeout if cancelled before expiry', () => {
    const onTimeout = vi.fn();
    const timer = new TurnTimer(30, onTimeout);

    timer.startTimer('game-1', 'player-1');
    vi.advanceTimersByTime(15_000);

    timer.cancelTimer('game-1');
    vi.advanceTimersByTime(30_000);

    expect(onTimeout).not.toHaveBeenCalled();

    timer.cancelAll();
  });

  it('should replace existing timer on startTimer', () => {
    const onTimeout = vi.fn();
    const timer = new TurnTimer(30, onTimeout);

    timer.startTimer('game-1', 'player-1');
    vi.advanceTimersByTime(20_000);

    // Start new timer for player-2 in same game
    timer.startTimer('game-1', 'player-2');
    vi.advanceTimersByTime(20_000);

    // player-1's timer was cancelled, player-2's hasn't expired yet
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(onTimeout).toHaveBeenCalledWith('game-1', 'player-2');

    timer.cancelAll();
  });

  it('should report active state correctly', () => {
    const onTimeout = vi.fn();
    const timer = new TurnTimer(30, onTimeout);

    expect(timer.isActive('game-1')).toBe(false);

    timer.startTimer('game-1', 'player-1');
    expect(timer.isActive('game-1')).toBe(true);

    timer.cancelTimer('game-1');
    expect(timer.isActive('game-1')).toBe(false);

    timer.cancelAll();
  });

  it('should calculate remaining time correctly', () => {
    const onTimeout = vi.fn();
    const timer = new TurnTimer(30, onTimeout);

    const now = new Date();
    vi.setSystemTime(now);

    timer.startTimer('game-1', 'player-1');

    vi.advanceTimersByTime(10_000);
    const remaining = timer.getRemainingTime('game-1', now);
    expect(remaining).toBe(20);

    timer.cancelAll();
  });

  it('should return 0 remaining time if no timer active', () => {
    const onTimeout = vi.fn();
    const timer = new TurnTimer(30, onTimeout);

    const remaining = timer.getRemainingTime('game-1', new Date());
    expect(remaining).toBe(0);
  });

  it('should use custom timeout duration', () => {
    const onTimeout = vi.fn();
    const timer = new TurnTimer(15, onTimeout);

    expect(timer.getTimeoutSeconds()).toBe(15);

    timer.startTimer('game-1', 'player-1');
    vi.advanceTimersByTime(15_000);

    expect(onTimeout).toHaveBeenCalledTimes(1);

    timer.cancelAll();
  });

  it('should cancel all timers at once', () => {
    const onTimeout = vi.fn();
    const timer = new TurnTimer(30, onTimeout);

    timer.startTimer('game-1', 'player-1');
    timer.startTimer('game-2', 'player-2');

    timer.cancelAll();

    vi.advanceTimersByTime(60_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('should clean up timer reference after timeout fires', () => {
    const onTimeout = vi.fn();
    const timer = new TurnTimer(30, onTimeout);

    timer.startTimer('game-1', 'player-1');
    vi.advanceTimersByTime(30_000);

    expect(timer.isActive('game-1')).toBe(false);
  });
});
