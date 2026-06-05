// ============================================================
// Data Model Interfaces
// ============================================================

/** Player account */
export interface Player {
  id: string;
  username: string;
  passwordHash: string;
  balance: number;
  createdAt: Date;
  lastLoginAt: Date;
  isTestAccount: boolean;
}

/** A game instance that players can register for */
export interface GameInstance {
  id: string;
  name: string;
  format: 'texas_holdem';
  maxPlayers: number;
  buyIn: number;
  startingChips: number;
  blindIntervalMinutes: number;
  registeredPlayers: string[];
  status: 'open' | 'full' | 'in_progress' | 'completed';
  createdAt: Date;
  endDate: Date;
  createdBy: string;
}

/** A tournament spawned from a game instance */
export interface Tournament {
  id: string;
  gameInstanceId: string;
  players: TournamentPlayer[];
  currentBlindLevel: number;
  blindSchedule: BlindLevel[];
  startedAt: Date;
  completedAt: Date | null;
  prizePool: number;
  winnerId: string | null;
  status: 'active' | 'completed';
}

/** A player participating in a tournament */
export interface TournamentPlayer {
  playerId: string;
  username: string;
  chipCount: number;
  status: 'active' | 'eliminated';
  finishPosition: number | null;
  eliminatedAt: Date | null;
}

/** A blind level in the schedule */
export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
}

/** A playing card */
export interface Card {
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

/** The state of a hand in progress */
export interface HandState {
  id: string;
  tournamentId: string;
  handNumber: number;
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  players: HandPlayer[];
  currentPlayerIndex: number;
  bettingRound: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  currentBet: number;
  minRaise: number;
  lastAction: PlayerAction | null;
  turnStartedAt: Date;
  turnTimeoutSeconds: number;
}

/** A player's state within a hand */
export interface HandPlayer {
  playerId: string;
  username: string;
  holeCards: Card[];
  chipCount: number;
  currentBet: number;
  totalBetThisHand: number;
  status: 'active' | 'folded' | 'all_in';
  hasActed: boolean;
}

/** A side pot created when a player goes all-in */
export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

/** A player action during a hand */
export type PlayerAction =
  | { type: 'check' }
  | { type: 'bet'; amount: number }
  | { type: 'call' }
  | { type: 'raise'; amount: number }
  | { type: 'fold' }
  | { type: 'all_in' };


// ============================================================
// Hand History Types
// ============================================================

/** Complete record of a played hand */
export interface HandHistory {
  handId: string;
  tournamentId: string;
  handNumber: number;
  blindLevel: BlindLevel;
  players: HandHistoryPlayer[];
  communityCards: Card[];
  actions: HandHistoryAction[];
  pots: { amount: number; winnerId: string }[];
  result: HandResult;
}

/** A player's record within hand history */
export interface HandHistoryPlayer {
  playerId: string;
  username: string;
  startingChips: number;
  holeCards: Card[] | null;
  netChipChange: number;
}

/** A single action recorded in hand history */
export interface HandHistoryAction {
  playerId: string;
  bettingRound: 'preflop' | 'flop' | 'turn' | 'river';
  action: PlayerAction;
  timestamp: Date;
}

/** The result of a completed hand */
export interface HandResult {
  winnerId: string;
  winningHand: HandRanking | null;
  method: 'showdown' | 'fold';
}

/** A hand ranking evaluation */
export interface HandRanking {
  rank: number;
  name: string;
  cards: Card[];
}

// ============================================================
// Blind Schedule Constant
// ============================================================

/** 8-level blind schedule relative to 500 starting chips */
export const BLIND_SCHEDULE: BlindLevel[] = [
  { level: 1, smallBlind: 10, bigBlind: 20 },
  { level: 2, smallBlind: 15, bigBlind: 30 },
  { level: 3, smallBlind: 25, bigBlind: 50 },
  { level: 4, smallBlind: 50, bigBlind: 100 },
  { level: 5, smallBlind: 75, bigBlind: 150 },
  { level: 6, smallBlind: 100, bigBlind: 200 },
  { level: 7, smallBlind: 150, bigBlind: 300 },
  { level: 8, smallBlind: 200, bigBlind: 400 },
];

// ============================================================
// WebSocket Event Types
// ============================================================

/** Server-to-client WebSocket events */
export interface ServerToClientEvents {
  'lobby:update': (payload: LobbyUpdatePayload) => void;
  'game:start': (payload: GameState) => void;
  'game:deal': (payload: GameDealPayload) => void;
  'game:state': (payload: GameState) => void;
  'game:turn': (payload: GameTurnPayload) => void;
  'game:blind-change': (payload: BlindLevel) => void;
  'game:eliminate': (payload: GameEliminatePayload) => void;
  'game:end': (payload: TournamentResult) => void;
  'player:disconnect': (payload: PlayerDisconnectPayload) => void;
  'auth:expired': () => void;
}

/** Client-to-server WebSocket events */
export interface ClientToServerEvents {
  'game:action': (payload: PlayerAction) => void;
  'lobby:subscribe': () => void;
  'lobby:unsubscribe': () => void;
  'game:join': (payload: { gameId: string }) => void;
}

// WebSocket event payloads

export interface LobbyUpdatePayload {
  gameId: string;
  playerCount: number;
  status: GameInstance['status'];
}

export interface GameState {
  handState: HandState;
  tournament: Tournament;
}

export interface GameDealPayload {
  holeCards: Card[];
  communityCards: Card[];
}

export interface GameTurnPayload {
  playerId: string;
  timeRemaining: number;
}

export interface GameEliminatePayload {
  playerId: string;
  position: number;
}

export interface TournamentResult {
  tournamentId: string;
  winnerId: string;
  standings: TournamentStanding[];
  prizePool: number;
}

export interface TournamentStanding {
  playerId: string;
  username: string;
  position: number;
}

export interface PlayerDisconnectPayload {
  playerId: string;
}

// ============================================================
// REST API Request/Response Types
// ============================================================

// --- Auth ---

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  player: Omit<Player, 'passwordHash'>;
  tokens: TokenPair;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  tokens: TokenPair;
}

// --- Lobby ---

export interface LobbyGameResponse {
  games: Omit<GameInstance, 'createdBy'>[];
}

export interface RegistrationResult {
  success: boolean;
  message: string;
  playerCount: number;
}

// --- Admin ---

export interface GameCreationRequest {
  name: string;
  maxPlayers: number;
  blindIntervalMinutes?: number;
  maxBlindLevel?: number;
  startingChips?: number;
  tableTheme?: 'classic-green' | 'dark-blue' | 'red-velvet' | 'midnight-purple' | 'pink-felt';
  turnTimeSeconds?: number;
}

export interface GameCreationResponse {
  game: GameInstance;
}

export interface AdminGameListResponse {
  games: GameInstance[];
}

// --- Hand History ---

export interface LastHandResponse {
  hand: HandHistory | null;
  message?: string;
}

// --- Error ---

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
