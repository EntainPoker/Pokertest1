import { BlindLevel } from '@spin-and-go/shared';

/**
 * BlindManager handles blind level progression during a tournament.
 *
 * Key behaviors:
 * - Timer counts down from intervalMinutes * 60 seconds per level
 * - When timer reaches 0, the next level becomes "pending" (not applied immediately)
 * - The pending level is applied when applyPendingLevel() is called (at the start of the next hand)
 * - If already at the final level (level 8), stays there indefinitely
 * - Emits callbacks when a level change becomes pending
 */
export class BlindManager {
  private blindSchedule: BlindLevel[];
  private intervalSeconds: number;
  private currentLevelIndex: number;
  private pendingLevelIndex: number | null;
  private timeRemaining: number;
  private timerInterval: ReturnType<typeof setInterval> | null;
  private levelChangeCallbacks: Array<(newLevel: BlindLevel) => void>;

  constructor(blindSchedule: BlindLevel[], intervalMinutes: number) {
    if (blindSchedule.length === 0) {
      throw new Error('Blind schedule must have at least one level');
    }
    this.blindSchedule = blindSchedule;
    this.intervalSeconds = intervalMinutes * 60;
    this.currentLevelIndex = 0;
    this.pendingLevelIndex = null;
    this.timeRemaining = this.intervalSeconds;
    this.timerInterval = null;
    this.levelChangeCallbacks = [];
  }

  /**
   * Starts the blind level timer. Ticks every second.
   */
  start(): void {
    if (this.timerInterval !== null) {
      return; // Already running
    }

    this.timerInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  /**
   * Stops the blind level timer.
   */
  stop(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Returns the current active blind level.
   */
  getCurrentLevel(): BlindLevel {
    return this.blindSchedule[this.currentLevelIndex];
  }

  /**
   * Returns the next blind level, or null if at the final level.
   */
  getNextLevel(): BlindLevel | null {
    const nextIndex = this.currentLevelIndex + 1;
    if (nextIndex >= this.blindSchedule.length) {
      return null;
    }
    return this.blindSchedule[nextIndex];
  }

  /**
   * Returns the number of seconds remaining until the next level change.
   */
  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /**
   * Returns true if a level change has occurred but hasn't been applied yet
   * (waiting for the next hand to start).
   */
  isLevelPending(): boolean {
    return this.pendingLevelIndex !== null;
  }

  /**
   * Applies the pending level change. Should be called at the start of a new hand.
   * Returns the new current blind level.
   */
  applyPendingLevel(): BlindLevel {
    if (this.pendingLevelIndex !== null) {
      this.currentLevelIndex = this.pendingLevelIndex;
      this.pendingLevelIndex = null;
    }
    return this.getCurrentLevel();
  }

  /**
   * Register a callback that fires when a level change becomes pending.
   */
  onLevelChange(callback: (newLevel: BlindLevel) => void): void {
    this.levelChangeCallbacks.push(callback);
  }

  /**
   * Internal tick handler — called every second by the timer.
   */
  private tick(): void {
    // If at the final level, don't count down
    if (this.currentLevelIndex >= this.blindSchedule.length - 1 && this.pendingLevelIndex === null) {
      return;
    }

    // If there's already a pending level, don't count down further
    if (this.pendingLevelIndex !== null) {
      return;
    }

    this.timeRemaining--;

    if (this.timeRemaining <= 0) {
      this.advanceLevel();
    }
  }

  /**
   * Advances to the next level by marking it as pending.
   */
  private advanceLevel(): void {
    const nextIndex = this.currentLevelIndex + 1;

    // Should not happen due to tick guard, but be safe
    if (nextIndex >= this.blindSchedule.length) {
      return;
    }

    this.pendingLevelIndex = nextIndex;
    this.timeRemaining = this.intervalSeconds;

    // Emit callbacks with the pending level
    const pendingLevel = this.blindSchedule[nextIndex];
    for (const callback of this.levelChangeCallbacks) {
      callback(pendingLevel);
    }
  }
}
