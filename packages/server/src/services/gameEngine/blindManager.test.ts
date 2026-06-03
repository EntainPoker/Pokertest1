import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlindLevel, BLIND_SCHEDULE } from '@spin-and-go/shared';
import { BlindManager } from './blindManager';

describe('BlindManager', () => {
  let manager: BlindManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new BlindManager(BLIND_SCHEDULE, 3); // 3-minute intervals
  });

  afterEach(() => {
    manager.stop();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize at level 1', () => {
      const level = manager.getCurrentLevel();
      expect(level).toEqual({ level: 1, smallBlind: 10, bigBlind: 20 });
    });

    it('should initialize with full time remaining (180 seconds)', () => {
      expect(manager.getTimeRemaining()).toBe(180);
    });

    it('should throw if blind schedule is empty', () => {
      expect(() => new BlindManager([], 3)).toThrow('Blind schedule must have at least one level');
    });

    it('should not have a pending level initially', () => {
      expect(manager.isLevelPending()).toBe(false);
    });
  });

  describe('start / stop', () => {
    it('should start counting down when start() is called', () => {
      manager.start();
      vi.advanceTimersByTime(1000); // 1 second
      expect(manager.getTimeRemaining()).toBe(179);
    });

    it('should stop counting down when stop() is called', () => {
      manager.start();
      vi.advanceTimersByTime(5000); // 5 seconds
      manager.stop();
      const remaining = manager.getTimeRemaining();
      vi.advanceTimersByTime(5000); // 5 more seconds
      expect(manager.getTimeRemaining()).toBe(remaining);
    });

    it('should not start multiple timers if start() is called twice', () => {
      manager.start();
      manager.start(); // second call should be no-op
      vi.advanceTimersByTime(1000);
      expect(manager.getTimeRemaining()).toBe(179); // only decremented once
    });
  });

  describe('timer countdown', () => {
    it('should count down every second', () => {
      manager.start();
      vi.advanceTimersByTime(10000); // 10 seconds
      expect(manager.getTimeRemaining()).toBe(170);
    });

    it('should mark level as pending when timer reaches 0', () => {
      manager.start();
      vi.advanceTimersByTime(180000); // 180 seconds = 3 minutes
      expect(manager.isLevelPending()).toBe(true);
    });

    it('should reset timer to 180 seconds after level becomes pending', () => {
      manager.start();
      vi.advanceTimersByTime(180000); // 3 minutes
      expect(manager.getTimeRemaining()).toBe(180);
    });

    it('should not count down further while a level is pending', () => {
      manager.start();
      vi.advanceTimersByTime(180000); // level becomes pending
      vi.advanceTimersByTime(10000); // 10 more seconds
      expect(manager.getTimeRemaining()).toBe(180); // unchanged
    });
  });

  describe('getCurrentLevel', () => {
    it('should return level 1 initially', () => {
      expect(manager.getCurrentLevel()).toEqual({ level: 1, smallBlind: 10, bigBlind: 20 });
    });

    it('should still return level 1 after timer expires (pending, not applied)', () => {
      manager.start();
      vi.advanceTimersByTime(180000);
      expect(manager.getCurrentLevel()).toEqual({ level: 1, smallBlind: 10, bigBlind: 20 });
    });

    it('should return level 2 after pending level is applied', () => {
      manager.start();
      vi.advanceTimersByTime(180000);
      manager.applyPendingLevel();
      expect(manager.getCurrentLevel()).toEqual({ level: 2, smallBlind: 15, bigBlind: 30 });
    });
  });

  describe('getNextLevel', () => {
    it('should return level 2 when at level 1', () => {
      expect(manager.getNextLevel()).toEqual({ level: 2, smallBlind: 15, bigBlind: 30 });
    });

    it('should return null when at the final level', () => {
      // Advance to level 8 (final)
      for (let i = 0; i < 7; i++) {
        manager.start();
        vi.advanceTimersByTime(180000);
        manager.applyPendingLevel();
        manager.stop();
      }
      expect(manager.getCurrentLevel().level).toBe(8);
      expect(manager.getNextLevel()).toBeNull();
    });
  });

  describe('isLevelPending', () => {
    it('should be false initially', () => {
      expect(manager.isLevelPending()).toBe(false);
    });

    it('should be true after timer expires', () => {
      manager.start();
      vi.advanceTimersByTime(180000);
      expect(manager.isLevelPending()).toBe(true);
    });

    it('should be false after applyPendingLevel is called', () => {
      manager.start();
      vi.advanceTimersByTime(180000);
      manager.applyPendingLevel();
      expect(manager.isLevelPending()).toBe(false);
    });
  });

  describe('applyPendingLevel', () => {
    it('should apply the pending level and return it', () => {
      manager.start();
      vi.advanceTimersByTime(180000);
      const applied = manager.applyPendingLevel();
      expect(applied).toEqual({ level: 2, smallBlind: 15, bigBlind: 30 });
    });

    it('should return current level if no pending level', () => {
      const applied = manager.applyPendingLevel();
      expect(applied).toEqual({ level: 1, smallBlind: 10, bigBlind: 20 });
    });

    it('should allow timer to resume counting after applying pending level', () => {
      manager.start();
      vi.advanceTimersByTime(180000); // level 2 pending
      manager.applyPendingLevel();
      vi.advanceTimersByTime(10000); // 10 seconds
      expect(manager.getTimeRemaining()).toBe(170);
    });

    it('should progress through multiple levels correctly', () => {
      manager.start();

      // Level 1 -> 2
      vi.advanceTimersByTime(180000);
      expect(manager.isLevelPending()).toBe(true);
      manager.applyPendingLevel();
      expect(manager.getCurrentLevel().level).toBe(2);

      // Level 2 -> 3
      vi.advanceTimersByTime(180000);
      expect(manager.isLevelPending()).toBe(true);
      manager.applyPendingLevel();
      expect(manager.getCurrentLevel().level).toBe(3);

      // Level 3 -> 4
      vi.advanceTimersByTime(180000);
      expect(manager.isLevelPending()).toBe(true);
      manager.applyPendingLevel();
      expect(manager.getCurrentLevel().level).toBe(4);
    });
  });

  describe('onLevelChange callback', () => {
    it('should emit callback when level becomes pending', () => {
      const callback = vi.fn();
      manager.onLevelChange(callback);
      manager.start();
      vi.advanceTimersByTime(180000);
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith({ level: 2, smallBlind: 15, bigBlind: 30 });
    });

    it('should support multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      manager.onLevelChange(callback1);
      manager.onLevelChange(callback2);
      manager.start();
      vi.advanceTimersByTime(180000);
      expect(callback1).toHaveBeenCalledOnce();
      expect(callback2).toHaveBeenCalledOnce();
    });

    it('should emit callback for each level change', () => {
      const callback = vi.fn();
      manager.onLevelChange(callback);
      manager.start();

      // First level change
      vi.advanceTimersByTime(180000);
      manager.applyPendingLevel();

      // Second level change
      vi.advanceTimersByTime(180000);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, { level: 2, smallBlind: 15, bigBlind: 30 });
      expect(callback).toHaveBeenNthCalledWith(2, { level: 3, smallBlind: 25, bigBlind: 50 });
    });
  });

  describe('final level behavior (level 8)', () => {
    let finalManager: BlindManager;

    beforeEach(() => {
      finalManager = new BlindManager(BLIND_SCHEDULE, 3);
      finalManager.start();

      // Advance through all 7 level transitions (1->2, 2->3, ..., 7->8)
      for (let i = 0; i < 7; i++) {
        vi.advanceTimersByTime(180000);
        finalManager.applyPendingLevel();
      }
    });

    afterEach(() => {
      finalManager.stop();
    });

    it('should be at level 8 after all transitions', () => {
      expect(finalManager.getCurrentLevel()).toEqual({ level: 8, smallBlind: 200, bigBlind: 400 });
    });

    it('should stay at level 8 indefinitely', () => {
      vi.advanceTimersByTime(600000); // 10 minutes
      expect(finalManager.isLevelPending()).toBe(false);
      expect(finalManager.getCurrentLevel()).toEqual({ level: 8, smallBlind: 200, bigBlind: 400 });
    });

    it('should not emit callbacks at the final level', () => {
      const callback = vi.fn();
      finalManager.onLevelChange(callback);
      vi.advanceTimersByTime(600000); // 10 minutes
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return null for getNextLevel at final level', () => {
      expect(finalManager.getNextLevel()).toBeNull();
    });
  });

  describe('blind level timing does not apply mid-hand', () => {
    it('should not change current level until applyPendingLevel is called', () => {
      manager.start();
      vi.advanceTimersByTime(180000); // timer expires

      // Simulate a hand in progress — current level should still be 1
      expect(manager.getCurrentLevel()).toEqual({ level: 1, smallBlind: 10, bigBlind: 20 });
      expect(manager.isLevelPending()).toBe(true);

      // Simulate hand completing and new hand starting
      const newLevel = manager.applyPendingLevel();
      expect(newLevel).toEqual({ level: 2, smallBlind: 15, bigBlind: 30 });
    });

    it('should handle multiple timer expirations while hand is in progress', () => {
      // Use a shorter interval for this test
      const shortManager = new BlindManager(BLIND_SCHEDULE, 1); // 1-minute intervals
      shortManager.start();

      vi.advanceTimersByTime(60000); // first level expires
      expect(shortManager.isLevelPending()).toBe(true);

      // Timer should not advance further while pending
      vi.advanceTimersByTime(60000); // another minute passes
      expect(shortManager.getCurrentLevel().level).toBe(1); // still level 1

      // Apply the pending level
      shortManager.applyPendingLevel();
      expect(shortManager.getCurrentLevel().level).toBe(2);

      shortManager.stop();
    });
  });
});
