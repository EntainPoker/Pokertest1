import type { PlayerAction } from '@spin-and-go/shared';

/**
 * Subset of HandPlayer fields needed for betting round tracking.
 */
export interface BettingPlayer {
  status: 'active' | 'folded' | 'all_in';
  hasActed: boolean;
  currentBet: number;
}

/**
 * Betting round types in Texas Hold'em.
 */
export type BettingRoundName = 'preflop' | 'flop' | 'turn' | 'river';

/**
 * Manages the state of a single betting round within a hand.
 * Tracks current bet, minimum raise, player actions, and determines
 * when the round is complete.
 */
export class BettingRound {
  private players: BettingPlayer[];
  private currentBet: number;
  private minRaise: number;

  constructor(players: BettingPlayer[], currentBet: number, minRaise: number) {
    this.players = players.map((p) => ({ ...p }));
    this.currentBet = currentBet;
    this.minRaise = minRaise;
  }

  /**
   * Returns true when the betting round is complete:
   * - All active (non-folded, non-all-in) players have acted at least once
   * - AND all active players have equal current bets (or all have checked with no outstanding bet)
   */
  isComplete(): boolean {
    const activePlayers = this.players.filter(
      (p) => p.status === 'active'
    );

    // If no active players remain (all folded or all-in), round is complete
    if (activePlayers.length === 0) {
      return true;
    }

    // All active players must have acted
    const allActed = activePlayers.every((p) => p.hasActed);
    if (!allActed) {
      return false;
    }

    // All active players must have equal bets (equalized)
    const betsEqualized = activePlayers.every(
      (p) => p.currentBet === this.currentBet
    );

    return betsEqualized;
  }

  /**
   * Gets the index of the next player who can act, skipping folded and all-in players.
   * Wraps around the player array circularly.
   * Returns -1 if no active player is found (shouldn't happen in normal play).
   */
  getNextPlayerIndex(currentIndex: number): number {
    const numPlayers = this.players.length;
    for (let i = 1; i <= numPlayers; i++) {
      const nextIndex = (currentIndex + i) % numPlayers;
      const player = this.players[nextIndex];
      if (player.status === 'active') {
        return nextIndex;
      }
    }
    return -1;
  }

  /**
   * Records a player action, updating their hasActed flag and bet amounts.
   * For all-in actions, pass the player's new currentBet as allInBet to properly
   * track the bet amount (since PlayerAction for all_in has no amount field).
   */
  recordAction(playerIndex: number, action: PlayerAction, allInBet?: number): void {
    const player = this.players[playerIndex];
    if (!player) {
      return;
    }

    player.hasActed = true;

    switch (action.type) {
      case 'check':
        // No bet change
        break;

      case 'bet':
        player.currentBet = action.amount;
        this.currentBet = action.amount;
        this.minRaise = action.amount;
        // Reset hasActed for other active players since they need to respond
        this.resetOtherPlayersActed(playerIndex);
        break;

      case 'call':
        player.currentBet = this.currentBet;
        break;

      case 'raise':
        const raiseIncrement = action.amount - this.currentBet;
        if (raiseIncrement >= this.minRaise) {
          this.minRaise = raiseIncrement;
        }
        player.currentBet = action.amount;
        this.currentBet = action.amount;
        // Reset hasActed for other active players since they need to respond
        this.resetOtherPlayersActed(playerIndex);
        break;

      case 'fold':
        player.status = 'folded';
        break;

      case 'all_in':
        // Use the provided allInBet or fall back to internal currentBet
        if (allInBet !== undefined) {
          player.currentBet = allInBet;
        }
        player.status = 'all_in';
        if (player.currentBet > this.currentBet) {
          // All-in acts as a raise — but only reopens action if it's a FULL raise
          const allInRaiseIncrement = player.currentBet - this.currentBet;
          if (allInRaiseIncrement >= this.minRaise) {
            // Full raise: update minRaise and reopen action for all players
            this.minRaise = allInRaiseIncrement;
            this.currentBet = player.currentBet;
            this.resetOtherPlayersActed(playerIndex);
          } else {
            // Partial raise (all-in for less than a full raise):
            // Update current bet but do NOT reopen action for previous callers
            this.currentBet = player.currentBet;
            // Do NOT call resetOtherPlayersActed — previous actors cannot re-raise
          }
        }
        break;
    }
  }

  /**
   * Returns the current highest bet in this round.
   */
  getCurrentBet(): number {
    return this.currentBet;
  }

  /**
   * Returns the minimum raise amount.
   */
  getMinRaise(): number {
    return this.minRaise;
  }

  /**
   * Returns indices of players who are still active (not folded, not all-in).
   */
  getActivePlayers(): number[] {
    return this.players
      .map((p, i) => (p.status === 'active' ? i : -1))
      .filter((i) => i !== -1);
  }

  /**
   * Returns a copy of the players array for inspection.
   */
  getPlayers(): BettingPlayer[] {
    return this.players.map((p) => ({ ...p }));
  }

  /**
   * Resets hasActed for all active players except the one who just acted.
   * Called when a bet or raise occurs, since other players need to respond.
   */
  private resetOtherPlayersActed(actingPlayerIndex: number): void {
    this.players.forEach((p, i) => {
      if (i !== actingPlayerIndex && p.status === 'active') {
        p.hasActed = false;
      }
    });
  }
}

/**
 * Utility for managing community card progression through betting rounds.
 */
export const RoundProgression = {
  /**
   * Returns the next round after the current one completes.
   */
  nextRound(
    current: BettingRoundName
  ): 'flop' | 'turn' | 'river' | 'showdown' {
    switch (current) {
      case 'preflop':
        return 'flop';
      case 'flop':
        return 'turn';
      case 'turn':
        return 'river';
      case 'river':
        return 'showdown';
    }
  },

  /**
   * Returns the total number of community cards that should be visible
   * at the start of the given round.
   */
  getCommunityCardCount(round: BettingRoundName | 'showdown'): 0 | 3 | 4 | 5 {
    switch (round) {
      case 'preflop':
        return 0;
      case 'flop':
        return 3;
      case 'turn':
        return 4;
      case 'river':
      case 'showdown':
        return 5;
    }
  },
};
