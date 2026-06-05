import { io } from '../../index.js';
import { activeGameStates } from '../gameStateStore.js';
import { playerConnections } from '../tournamentService.js';
import { query } from '../../config/database.js';
import { Deck } from './deck.js';
import { BettingRound, RoundProgression } from './bettingRound.js';
import { evaluateHand, compareHands, determineWinners } from './handEvaluator.js';
import { calculateSidePots } from './sidePotManager.js';
import { PositionManager } from './positionManager.js';
import { processPlayerAction, getAvailableActions, TurnTimer } from './actionProcessor.js';
import { BlindManager } from './blindManager.js';
import { checkEliminations, checkTournamentComplete } from './tournamentElimination.js';
import type {
  GameState,
  HandState,
  HandPlayer,
  Card,
  PlayerAction,
  BlindLevel,
  SidePot,
} from '@spin-and-go/shared';

// ============================================================
// Types
// ============================================================

interface RecordedAction {
  playerId: string;
  bettingRound: 'preflop' | 'flop' | 'turn' | 'river';
  action: PlayerAction;
  timestamp: Date;
}

interface GameLoopInstance {
  gameInstanceId: string;
  positionManager: PositionManager;
  blindManager: BlindManager;
  turnTimer: TurnTimer;
  deck: Deck;
  bettingRound: BettingRound | null;
  handNumber: number;
  eliminatedCount: number;
  /** Map of playerId -> hole cards (server-side secret) */
  playerHoleCards: Map<string, Card[]>;
  /** Actions recorded during the current hand */
  handActions: RecordedAction[];
  /** Starting chip counts for this hand (for history) */
  startingChipCounts: Map<string, number>;
}

/** Active game loop instances keyed by gameInstanceId */
const gameLoops = new Map<string, GameLoopInstance>();

// ============================================================
// Public API
// ============================================================

/**
 * Returns a player's hole cards for a given game instance.
 * Used when a player reconnects/joins to send them their cards.
 */
export function getPlayerHoleCards(gameInstanceId: string, playerId: string): Card[] | null {
  const instance = gameLoops.get(gameInstanceId);
  if (!instance) return null;
  return instance.playerHoleCards.get(playerId) ?? null;
}

/**
 * Starts the game loop for a tournament.
 * Called after tournament creation when all players have joined.
 */
export function startGameLoop(gameInstanceId: string): void {
  const gameState = activeGameStates.get(gameInstanceId);
  if (!gameState) {
    console.error(`[GameLoop] No game state found for ${gameInstanceId}`);
    return;
  }

  const { tournament } = gameState;
  const playerCount = tournament.players.filter(p => p.status === 'active').length;

  if (playerCount < 2) {
    console.error(`[GameLoop] Not enough players to start: ${playerCount}`);
    return;
  }

  // Initialize position manager
  const positionManager = new PositionManager(playerCount, 0);

  // Initialize blind manager
  const blindManager = new BlindManager(
    tournament.blindSchedule,
    // Get blind interval from the game state - default to 3 minutes
    3
  );
  blindManager.start();

  // Initialize turn timer with auto-fold on timeout
  const turnTimer = new TurnTimer(15, (gameId, playerId) => {
    handleTimeout(gameId, playerId);
  });

  const instance: GameLoopInstance = {
    gameInstanceId,
    positionManager,
    blindManager,
    turnTimer,
    deck: new Deck(),
    bettingRound: null,
    handNumber: 0,
    eliminatedCount: 0,
    playerHoleCards: new Map(),
    handActions: [],
    startingChipCounts: new Map(),
  };

  gameLoops.set(gameInstanceId, instance);

  // Start the first hand after a short delay
  setTimeout(() => {
    startNewHand(gameInstanceId);
  }, 2000);
}

/**
 * Handles a player action from the client.
 * Called from the socket handler in index.ts.
 */
export function handlePlayerAction(
  gameInstanceId: string,
  playerId: string,
  action: PlayerAction
): void {
  const instance = gameLoops.get(gameInstanceId);
  if (!instance) {
    console.error(`[GameLoop] No game loop for ${gameInstanceId}`);
    return;
  }

  const gameState = activeGameStates.get(gameInstanceId);
  if (!gameState) return;

  const { handState } = gameState;

  // Verify it's this player's turn
  const currentPlayer = handState.players[handState.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.playerId !== playerId) {
    // Not this player's turn — ignore
    return;
  }

  // Cancel the turn timer
  instance.turnTimer.cancelTimer(gameInstanceId);

  // Process the action
  const result = processPlayerAction(handState, handState.currentPlayerIndex, action);

  if (!result.success) {
    // Emit error back to the player
    const connection = playerConnections.get(playerId);
    if (connection) {
      io.to(connection.socketId).emit('game:action:error' as any, { error: result.error });
    }
    // Restart the turn timer since action failed
    instance.turnTimer.startTimer(gameInstanceId, playerId);
    return;
  }

  // Apply the updated player state
  handState.players[handState.currentPlayerIndex] = result.updatedPlayer!;
  handState.lastAction = result.processedAction!;
  handState.lastActionText = getActionText(result.processedAction!);
  handState.lastActionPlayerId = playerId;

  // Record the action for hand history
  instance.handActions.push({
    playerId,
    bettingRound: handState.bettingRound as 'preflop' | 'flop' | 'turn' | 'river',
    action: result.processedAction!,
    timestamp: new Date(),
  });

  // Update the betting round tracker
  if (instance.bettingRound) {
    const allInBet = result.processedAction!.type === 'all_in'
      ? result.updatedPlayer!.currentBet
      : undefined;
    instance.bettingRound.recordAction(handState.currentPlayerIndex, result.processedAction!, allInBet);
  }

  // Update pot from player bets
  updatePot(handState);

  // Update min raise if bet/raise occurred
  if (result.processedAction!.type === 'bet' || result.processedAction!.type === 'raise') {
    if (instance.bettingRound) {
      handState.currentBet = instance.bettingRound.getCurrentBet();
      handState.minRaise = instance.bettingRound.getMinRaise();
    }
  }
  if (result.processedAction!.type === 'all_in') {
    // All-in may act as a raise
    if (instance.bettingRound) {
      handState.currentBet = instance.bettingRound.getCurrentBet();
      handState.minRaise = instance.bettingRound.getMinRaise();
    }
  }

  // Check if only one player remains (all others folded)
  const activePlayers = handState.players.filter(p => p.status !== 'folded');
  if (activePlayers.length === 1) {
    // Award pot to the last remaining player — no showdown
    awardPotToLastPlayer(gameInstanceId, activePlayers[0]);
    return;
  }

  // Check if betting round is complete
  if (instance.bettingRound && instance.bettingRound.isComplete()) {
    advanceToNextRound(gameInstanceId);
    return;
  }

  // Move to next player
  const nextIndex = getNextActivePlayerIndex(handState, handState.currentPlayerIndex);
  handState.currentPlayerIndex = nextIndex;

  // Store updated state
  persistState(gameInstanceId, gameState);

  // Emit state update
  emitGameState(gameInstanceId, gameState);

  // Start turn timer for next player
  const nextPlayer = handState.players[nextIndex];
  startTurnForPlayer(gameInstanceId, nextPlayer.playerId, handState);
}

/**
 * Cleans up the game loop instance (e.g., when tournament ends).
 */
export function stopGameLoop(gameInstanceId: string): void {
  const instance = gameLoops.get(gameInstanceId);
  if (instance) {
    instance.turnTimer.cancelAll();
    instance.blindManager.stop();
    gameLoops.delete(gameInstanceId);
  }
}

// ============================================================
// Hand Lifecycle
// ============================================================

function startNewHand(gameInstanceId: string): void {
  const instance = gameLoops.get(gameInstanceId);
  if (!instance) return;

  const gameState = activeGameStates.get(gameInstanceId);
  if (!gameState) return;

  // Apply pending blind level if timer advanced
  if (instance.blindManager.isLevelPending()) {
    const newLevel = instance.blindManager.applyPendingLevel();
    gameState.tournament.currentBlindLevel = newLevel.level;
    io.to(`game:${gameInstanceId}`).emit('game:blind-change' as any, newLevel);
  }

  instance.handNumber++;
  const blindLevel = instance.blindManager.getCurrentLevel();

  // Get positions
  const positions = instance.positionManager.getPositions();

  // Reset deck
  instance.deck = new Deck();
  instance.deck.shuffle();

  // Clear hole cards map
  instance.playerHoleCards.clear();

  // Reset actions for new hand
  instance.handActions = [];
  instance.startingChipCounts = new Map();

  // Build player list for this hand (only active tournament players)
  const activeTournamentPlayers = gameState.tournament.players.filter(
    p => p.status === 'active'
  );

  const handPlayers: HandPlayer[] = activeTournamentPlayers.map((tp, index) => ({
    playerId: tp.playerId,
    username: tp.username,
    holeCards: [], // Server doesn't store in hand state broadcast
    chipCount: tp.chipCount,
    currentBet: 0,
    totalBetThisHand: 0,
    status: 'active' as const,
    hasActed: false,
  }));

  // Store starting chip counts for hand history
  for (const hp of handPlayers) {
    instance.startingChipCounts.set(hp.playerId, hp.chipCount);
  }

  // Determine position indices within the active player array
  const dealerPlayerIndex = positions.dealer;
  const sbPlayerIndex = positions.smallBlind;
  const bbPlayerIndex = positions.bigBlind;

  // Post blinds
  const sbAmount = Math.min(blindLevel.smallBlind, handPlayers[sbPlayerIndex].chipCount);
  const bbAmount = Math.min(blindLevel.bigBlind, handPlayers[bbPlayerIndex].chipCount);

  handPlayers[sbPlayerIndex].chipCount -= sbAmount;
  handPlayers[sbPlayerIndex].currentBet = sbAmount;
  handPlayers[sbPlayerIndex].totalBetThisHand = sbAmount;

  handPlayers[bbPlayerIndex].chipCount -= bbAmount;
  handPlayers[bbPlayerIndex].currentBet = bbAmount;
  handPlayers[bbPlayerIndex].totalBetThisHand = bbAmount;

  // Mark players as all-in if blinds took all their chips
  if (handPlayers[sbPlayerIndex].chipCount === 0) {
    handPlayers[sbPlayerIndex].status = 'all_in';
  }
  if (handPlayers[bbPlayerIndex].chipCount === 0) {
    handPlayers[bbPlayerIndex].status = 'all_in';
  }

  // Deal hole cards
  const holeCardSets = instance.deck.dealHoleCards(handPlayers.length);
  for (let i = 0; i < handPlayers.length; i++) {
    instance.playerHoleCards.set(handPlayers[i].playerId, holeCardSets[i]);
  }

  // Calculate initial pot
  const initialPot = sbAmount + bbAmount;

  // Determine first player to act preflop
  let firstToAct: number;
  if (handPlayers.length === 2) {
    // Heads-up: Button/SB acts first preflop
    firstToAct = sbPlayerIndex;
  } else {
    // 3+ players: UTG (left of BB) acts first preflop
    firstToAct = (bbPlayerIndex + 1) % handPlayers.length;
  }

  // Skip folded/all-in players to find first active player
  firstToAct = findNextActiveFromIndex(handPlayers, firstToAct);

  // Create hand state
  const handState: HandState = {
    id: `${gameInstanceId}-hand-${instance.handNumber}`,
    tournamentId: gameState.tournament.id,
    handNumber: instance.handNumber,
    dealerPosition: dealerPlayerIndex,
    smallBlindPosition: sbPlayerIndex,
    bigBlindPosition: bbPlayerIndex,
    communityCards: [],
    pot: initialPot,
    sidePots: [],
    players: handPlayers,
    currentPlayerIndex: firstToAct,
    bettingRound: 'preflop',
    currentBet: bbAmount,
    minRaise: blindLevel.bigBlind,
    lastAction: null,
    turnStartedAt: new Date(),
    turnTimeoutSeconds: 15,
  };

  // Initialize betting round tracker
  instance.bettingRound = new BettingRound(
    handPlayers.map(p => ({
      status: p.status,
      hasActed: false,
      currentBet: p.currentBet,
    })),
    bbAmount,
    blindLevel.bigBlind
  );

  // Mark SB and BB as having acted in the betting round (they posted blinds)
  // But they still get a chance to act when action comes around
  // Actually in preflop, SB and BB haven't "acted" yet - posting blinds doesn't count
  // The BB specifically gets to check/raise when action returns to them

  // Update game state
  gameState.handState = handState;
  persistState(gameInstanceId, gameState);

  // Emit hole cards privately to each player
  for (const [playerId, cards] of instance.playerHoleCards.entries()) {
    const connection = playerConnections.get(playerId);
    if (connection) {
      io.to(connection.socketId).emit('game:deal', {
        holeCards: cards,
        communityCards: [],
      });
    }
  }

  // Emit game state to all (without hole cards for privacy)
  emitGameState(gameInstanceId, gameState);

  // Check if all players are all-in (no action needed)
  const activePlayerCount = handPlayers.filter(p => p.status === 'active').length;
  if (activePlayerCount <= 1) {
    // Everyone is all-in or only one active player — run out community cards
    runOutBoard(gameInstanceId);
    return;
  }

  // Start turn timer for first player
  const firstPlayer = handPlayers[firstToAct];
  startTurnForPlayer(gameInstanceId, firstPlayer.playerId, handState);
}

// ============================================================
// Round Progression
// ============================================================

function advanceToNextRound(gameInstanceId: string): void {
  const instance = gameLoops.get(gameInstanceId);
  if (!instance) return;

  const gameState = activeGameStates.get(gameInstanceId);
  if (!gameState) return;

  const { handState } = gameState;
  const currentRound = handState.bettingRound as 'preflop' | 'flop' | 'turn' | 'river';
  const nextRound = RoundProgression.nextRound(currentRound);

  if (nextRound === 'showdown') {
    handleShowdown(gameInstanceId);
    return;
  }

  // Deal community cards
  let newCards: Card[] = [];
  switch (nextRound) {
    case 'flop':
      newCards = instance.deck.dealFlop();
      handState.communityCards = newCards;
      break;
    case 'turn':
      const turnCard = instance.deck.dealTurn();
      handState.communityCards.push(turnCard);
      newCards = [turnCard];
      break;
    case 'river':
      const riverCard = instance.deck.dealRiver();
      handState.communityCards.push(riverCard);
      newCards = [riverCard];
      break;
  }

  // Reset betting state for new round
  handState.bettingRound = nextRound;
  handState.currentBet = 0;
  handState.minRaise = instance.blindManager.getCurrentLevel().bigBlind;
  handState.lastAction = null;

  // Reset player bets and hasActed for new round
  for (const player of handState.players) {
    player.currentBet = 0;
    if (player.status === 'active') {
      player.hasActed = false;
    }
  }

  // Determine first player to act postflop:
  // First active player left of the dealer (button)
  let firstToAct: number;
  if (handState.players.length === 2) {
    // Heads-up postflop: BB acts first (non-dealer)
    firstToAct = handState.bigBlindPosition;
  } else {
    // First active player after dealer
    firstToAct = (handState.dealerPosition + 1) % handState.players.length;
  }
  firstToAct = findNextActiveFromIndex(handState.players, firstToAct);

  handState.currentPlayerIndex = firstToAct;

  // Re-initialize betting round tracker
  instance.bettingRound = new BettingRound(
    handState.players.map(p => ({
      status: p.status,
      hasActed: false,
      currentBet: 0,
    })),
    0,
    instance.blindManager.getCurrentLevel().bigBlind
  );

  // Persist and emit
  persistState(gameInstanceId, gameState);

  // Emit community cards to all
  io.to(`game:${gameInstanceId}`).emit('game:deal', {
    holeCards: [],
    communityCards: handState.communityCards,
  });

  emitGameState(gameInstanceId, gameState);

  // Check if only one active player remains (others are all-in/folded)
  const activePlayers = handState.players.filter(p => p.status === 'active');
  if (activePlayers.length <= 1) {
    // No more betting possible, run out remaining cards
    runOutBoard(gameInstanceId);
    return;
  }

  // Start turn timer for first player
  const firstPlayer = handState.players[firstToAct];
  startTurnForPlayer(gameInstanceId, firstPlayer.playerId, handState);
}

/**
 * When all players are all-in or only one is active, deal remaining community cards
 * sequentially with delays and go to showdown.
 */
function runOutBoard(gameInstanceId: string): void {
  const instance = gameLoops.get(gameInstanceId);
  if (!instance) return;

  const gameState = activeGameStates.get(gameInstanceId);
  if (!gameState) return;

  const { handState } = gameState;

  function emitCommunityCards() {
    io.to(`game:${gameInstanceId}`).emit('game:deal', {
      holeCards: [],
      communityCards: handState.communityCards,
    });
    emitGameState(gameInstanceId, gameState);
  }

  // Deal flop if needed
  if (handState.communityCards.length === 0) {
    const flopCards = instance.deck.dealFlop();
    handState.communityCards.push(...flopCards);
    emitCommunityCards();

    // After 2500ms, deal turn
    setTimeout(() => {
      const gs = activeGameStates.get(gameInstanceId);
      if (!gs) return;
      gs.handState.communityCards.push(instance.deck.dealTurn());
      emitCommunityCards();

      // After 2500ms, deal river
      setTimeout(() => {
        const gs2 = activeGameStates.get(gameInstanceId);
        if (!gs2) return;
        gs2.handState.communityCards.push(instance.deck.dealRiver());
        emitCommunityCards();

        // After 2000ms, go to showdown
        setTimeout(() => {
          handleShowdown(gameInstanceId);
        }, 2000);
      }, 2500);
    }, 2500);
  } else if (handState.communityCards.length === 3) {
    // Deal turn
    handState.communityCards.push(instance.deck.dealTurn());
    emitCommunityCards();

    setTimeout(() => {
      const gs = activeGameStates.get(gameInstanceId);
      if (!gs) return;
      gs.handState.communityCards.push(instance.deck.dealRiver());
      emitCommunityCards();

      setTimeout(() => {
        handleShowdown(gameInstanceId);
      }, 2000);
    }, 2500);
  } else if (handState.communityCards.length === 4) {
    // Deal river
    handState.communityCards.push(instance.deck.dealRiver());
    emitCommunityCards();

    setTimeout(() => {
      handleShowdown(gameInstanceId);
    }, 2000);
  } else {
    // All cards already dealt
    handleShowdown(gameInstanceId);
  }
}

// ============================================================
// Showdown & Pot Award
// ============================================================

function handleShowdown(gameInstanceId: string): void {
  const instance = gameLoops.get(gameInstanceId);
  if (!instance) return;

  const gameState = activeGameStates.get(gameInstanceId);
  if (!gameState) return;

  const { handState } = gameState;
  handState.bettingRound = 'showdown';

  // Calculate side pots
  const potPlayers = handState.players.map(p => ({
    playerId: p.playerId,
    totalBetThisHand: p.totalBetThisHand,
    status: p.status,
  }));
  const sidePots = calculateSidePots(potPlayers);

  // If no side pots calculated (edge case), create one main pot
  const pots = sidePots.length > 0 ? sidePots : [{
    amount: handState.pot,
    eligiblePlayerIds: handState.players
      .filter(p => p.status !== 'folded')
      .map(p => p.playerId),
  }];

  // Evaluate hands and award each pot
  const communityCards = handState.communityCards;
  const potResults: { winnerId: string; amount: number }[] = [];

  for (const pot of pots) {
    // Get eligible players who haven't folded
    const eligiblePlayers = pot.eligiblePlayerIds
      .map(id => {
        const holeCards = instance.playerHoleCards.get(id);
        return holeCards ? { playerId: id, holeCards } : null;
      })
      .filter((p): p is { playerId: string; holeCards: Card[] } => p !== null);

    if (eligiblePlayers.length === 0) continue;

    if (eligiblePlayers.length === 1) {
      // Only one eligible player — award pot to them
      const winner = handState.players.find(p => p.playerId === eligiblePlayers[0].playerId)!;
      winner.chipCount += pot.amount;
      potResults.push({ winnerId: winner.playerId, amount: pot.amount });
    } else {
      // Determine winner(s)
      const result = determineWinners(eligiblePlayers, communityCards);

      if (result.winnerIds.length === 1) {
        const winner = handState.players.find(p => p.playerId === result.winnerIds[0])!;
        winner.chipCount += pot.amount;
        potResults.push({ winnerId: winner.playerId, amount: pot.amount });
      } else {
        // Split pot
        const splitAmount = Math.floor(pot.amount / result.winnerIds.length);
        const remainder = pot.amount - splitAmount * result.winnerIds.length;

        result.winnerIds.forEach((winnerId, idx) => {
          const winner = handState.players.find(p => p.playerId === winnerId)!;
          // Give remainder to first winner (standard rule)
          const amount = splitAmount + (idx === 0 ? remainder : 0);
          winner.chipCount += amount;
          potResults.push({ winnerId, amount });
        });
      }
    }
  }

  // Update hand state
  handState.pot = 0;
  handState.sidePots = pots;

  // Persist and emit
  persistState(gameInstanceId, gameState);
  emitGameState(gameInstanceId, gameState);

  // Complete the hand after a delay so players can see showdown
  setTimeout(() => {
    completeHand(gameInstanceId);
  }, 5000);
}

/**
 * Award pot immediately when all other players have folded.
 * Does NOT show cards.
 */
function awardPotToLastPlayer(gameInstanceId: string, winner: HandPlayer): void {
  const instance = gameLoops.get(gameInstanceId);
  if (!instance) return;

  const gameState = activeGameStates.get(gameInstanceId);
  if (!gameState) return;

  const { handState } = gameState;

  // Award entire pot to the winner
  winner.chipCount += handState.pot;
  handState.pot = 0;

  // Mark hand as complete
  handState.bettingRound = 'showdown';

  persistState(gameInstanceId, gameState);
  emitGameState(gameInstanceId, gameState);

  // Complete the hand after a delay so players see the result
  setTimeout(() => {
    completeHand(gameInstanceId);
  }, 4000);
}

// ============================================================
// Hand Completion
// ============================================================

function completeHand(gameInstanceId: string): void {
  const instance = gameLoops.get(gameInstanceId);
  if (!instance) return;

  const gameState = activeGameStates.get(gameInstanceId);
  if (!gameState) return;

  const { handState, tournament } = gameState;

  // Update tournament player chip counts from hand results
  for (const handPlayer of handState.players) {
    const tournamentPlayer = tournament.players.find(
      tp => tp.playerId === handPlayer.playerId
    );
    if (tournamentPlayer) {
      tournamentPlayer.chipCount = handPlayer.chipCount;
    }
  }

  // Save hand history to database
  try {
    const handId = `${gameInstanceId}-hand-${instance.handNumber}`;
    const players = handState.players.map(p => ({
      playerId: p.playerId,
      username: p.username,
      startingChips: instance.startingChipCounts.get(p.playerId) ?? 0,
      holeCards: instance.playerHoleCards.get(p.playerId) ?? null,
      netChipChange: p.chipCount - (instance.startingChipCounts.get(p.playerId) ?? p.chipCount),
    }));

    // Determine winner(s)
    const winnerPlayer = handState.players.reduce((prev, curr) =>
      curr.chipCount > prev.chipCount ? curr : prev
    , handState.players[0]);

    const activePlayers = handState.players.filter(p => p.status !== 'folded');
    const method = activePlayers.length === 1 ? 'fold' : 'showdown';

    const result = JSON.stringify({
      winnerId: winnerPlayer.playerId,
      winningHand: null,
      method,
    });

    const potTotal = handState.players.reduce((sum, p) => sum + p.totalBetThisHand, 0);

    query(
      'INSERT INTO hand_histories (id, tournament_id, hand_number, community_cards, actions, players, result, pot_total, played_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [
        handId,
        tournament.id,
        instance.handNumber,
        JSON.stringify(handState.communityCards),
        JSON.stringify(instance.handActions),
        JSON.stringify(players),
        result,
        potTotal,
      ]
    );
  } catch (err) {
    console.error('[GameLoop] Failed to save hand history:', err);
  }

  // Check for eliminations
  const eliminationPlayers = handState.players.map(hp => ({
    playerId: hp.playerId,
    username: hp.username,
    chipCount: hp.chipCount,
    startingChipsThisHand: hp.totalBetThisHand + hp.chipCount, // Approximate starting chips
  }));

  const eliminationResult = checkEliminations(eliminationPlayers, instance.eliminatedCount);

  // Process eliminations
  for (const eliminated of eliminationResult.eliminatedPlayers) {
    instance.eliminatedCount++;

    // Update tournament player status
    const tp = tournament.players.find(p => p.playerId === eliminated.playerId);
    if (tp) {
      tp.status = 'eliminated';
      tp.finishPosition = eliminated.position;
      tp.eliminatedAt = new Date();
    }

    // Remove from position manager
    const playerIndex = handState.players.findIndex(p => p.playerId === eliminated.playerId);
    if (playerIndex >= 0 && instance.positionManager.getActivePlayerCount() > 2) {
      instance.positionManager.removePlayer(playerIndex);
    }

    // Emit elimination event
    io.to(`game:${gameInstanceId}`).emit('game:eliminate', {
      playerId: eliminated.playerId,
      position: eliminated.position,
    });
  }

  // Check if tournament is complete
  const completionResult = checkTournamentComplete(eliminationPlayers);

  if (completionResult) {
    // Tournament is over
    tournament.status = 'completed';
    tournament.completedAt = new Date();
    tournament.winnerId = completionResult.winnerId;

    // Update winner's finish position
    const winnerTp = tournament.players.find(p => p.playerId === completionResult.winnerId);
    if (winnerTp) {
      winnerTp.finishPosition = 1;
    }

    // Credit the winner's account balance with the prize pool
    try {
      query(
        'UPDATE players SET balance = balance + ? WHERE id = ?',
        [tournament.prizePool, completionResult.winnerId]
      );
    } catch (err) {
      console.error('[GameLoop] Failed to credit winner balance:', err);
    }

    persistState(gameInstanceId, gameState);

    // Emit tournament end
    io.to(`game:${gameInstanceId}`).emit('game:end', {
      tournamentId: tournament.id,
      winnerId: completionResult.winnerId,
      standings: completionResult.standings,
      prizePool: completionResult.prizePool,
    });

    // Clean up
    stopGameLoop(gameInstanceId);
    return;
  }

  // Rotate dealer for next hand
  instance.positionManager.rotate();

  persistState(gameInstanceId, gameState);

  // Start next hand after 5 seconds so players see final board
  setTimeout(() => {
    startNewHand(gameInstanceId);
  }, 5000);
}

// ============================================================
// Turn Management
// ============================================================

function startTurnForPlayer(
  gameInstanceId: string,
  playerId: string,
  handState: HandState
): void {
  const instance = gameLoops.get(gameInstanceId);
  if (!instance) return;

  const turnStartedAt = instance.turnTimer.startTimer(gameInstanceId, playerId);
  handState.turnStartedAt = turnStartedAt;

  // Emit turn event
  io.to(`game:${gameInstanceId}`).emit('game:turn', {
    playerId,
    timeRemaining: 15,
  });
}

function handleTimeout(gameInstanceId: string, playerId: string): void {
  // Auto-fold the player who timed out
  handlePlayerAction(gameInstanceId, playerId, { type: 'fold' });
}

// ============================================================
// Helpers
// ============================================================

/**
 * Finds the next active (not folded, not all-in) player index starting from a given index.
 */
function findNextActiveFromIndex(players: HandPlayer[], startIndex: number): number {
  const count = players.length;
  for (let i = 0; i < count; i++) {
    const idx = (startIndex + i) % count;
    if (players[idx].status === 'active') {
      return idx;
    }
  }
  // Fallback: return startIndex (shouldn't happen in normal play)
  return startIndex;
}

/**
 * Gets the next active player index after the current player.
 */
function getNextActivePlayerIndex(handState: HandState, currentIndex: number): number {
  const count = handState.players.length;
  for (let i = 1; i <= count; i++) {
    const idx = (currentIndex + i) % count;
    if (handState.players[idx].status === 'active') {
      return idx;
    }
  }
  return currentIndex;
}

/**
 * Recalculates the pot from all player bets.
 */
function updatePot(handState: HandState): void {
  let total = 0;
  for (const player of handState.players) {
    total += player.totalBetThisHand;
  }
  handState.pot = total;
}

/**
 * Converts a PlayerAction into a human-readable string.
 */
function getActionText(action: PlayerAction): string {
  switch (action.type) {
    case 'check': return 'Check';
    case 'call': return 'Call';
    case 'fold': return 'Fold';
    case 'all_in': return 'All-In';
    case 'bet': return `Bet $${action.amount}`;
    case 'raise': return `Raise $${action.amount}`;
    default: return '';
  }
}

/**
 * Persists the game state in the active game states store.
 */
function persistState(gameInstanceId: string, gameState: GameState): void {
  activeGameStates.set(gameInstanceId, gameState);
}

/**
 * Emits the game state to all players in the game room.
 * Hole cards are stripped — each player gets their own cards via game:deal.
 * At showdown, non-folded players' hole cards are revealed to all.
 */
function emitGameState(gameInstanceId: string, gameState: GameState): void {
  const instance = gameLoops.get(gameInstanceId);
  const isShowdown = gameState.handState.bettingRound === 'showdown';

  // Create a sanitized version without hole cards and with safe serializable values
  const sanitizedState: GameState = {
    ...gameState,
    tableTheme: gameState.tableTheme, // Explicitly preserve table theme
    handState: {
      ...gameState.handState,
      players: gameState.handState.players.map(p => ({
        ...p,
        holeCards: isShowdown && p.status !== 'folded' && instance
          ? (instance.playerHoleCards.get(p.playerId) || [])
          : [], // Hide during normal play, reveal at showdown for non-folded players
      })),
      lastAction: null, // Don't send action objects to prevent React render crashes
      lastActionText: gameState.handState.lastActionText ?? null,
      lastActionPlayerId: gameState.handState.lastActionPlayerId ?? null,
      turnStartedAt: new Date(), // Always send as fresh Date (serialized to string by Socket.IO)
      sidePots: (gameState.handState.sidePots || []).map(sp => ({
        amount: typeof sp.amount === 'number' ? sp.amount : 0,
        eligiblePlayerIds: Array.isArray(sp.eligiblePlayerIds) ? sp.eligiblePlayerIds : [],
      })),
    },
  };

  io.to(`game:${gameInstanceId}`).emit('game:state', sanitizedState);
}
