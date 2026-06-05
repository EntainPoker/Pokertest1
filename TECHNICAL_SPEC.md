# Entain Poker — Complete Technical Specification

## 1. Project Overview

**Product:** Browser-based real-time multiplayer Texas Hold'em poker platform
**Formats:** Spin & Go (3+ player tournaments) and Heads-Up (2 player)
**Target:** Desktop browsers + Mobile Safari/Chrome (no app install)
**Payout:** Winner takes all (buy-in × player count)

---

## 2. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | React + TypeScript + Vite | React 18, Vite 5, TS 5.4 |
| Styling | Tailwind CSS | 3.x |
| State | Zustand | 4.x |
| Backend | Node.js + Express + TypeScript | Node 20+, Express 4 |
| Database | SQLite via better-sqlite3 | 12.x |
| Real-time | Socket.IO | 4.7 |
| Auth | JWT (jsonwebtoken) + bcrypt | |
| Build | tsx (for server runtime) | 4.x |
| Test | Vitest + fast-check | |
| Hosting | Render (free tier) | |
| Repo | GitHub (monorepo, npm workspaces) | |

---

## 3. Project Structure

```
/
├── package.json              # Root workspace config
├── packages/
│   ├── shared/src/index.ts   # Shared TypeScript interfaces + constants
│   ├── client/               # React frontend
│   │   ├── src/
│   │   │   ├── App.tsx       # Router (public + protected + admin routes)
│   │   │   ├── pages/        # LoginPage, RegisterPage, LobbyPage, GamePage, AdminPage, AdminLoginPage
│   │   │   ├── components/
│   │   │   │   ├── auth/     # AuthGuard, LoginForm, RegisterForm
│   │   │   │   ├── lobby/    # LobbyView, GameInstanceCard, EmptyLobbyMessage
│   │   │   │   ├── table/    # PokerTable, PlayerSeat, ActionPanel, CommunityCards, PotDisplay, BlindTimer, DealerButton
│   │   │   │   ├── shared/   # Card, ChipStack, Timer, ErrorBoundary
│   │   │   │   ├── tournament/ # TournamentLobby, PlayerStandings
│   │   │   │   └── history/  # LastHandSummary
│   │   │   ├── hooks/        # useAuth, useSocket, useGameState
│   │   │   ├── stores/       # authStore, lobbyStore, gameStore (Zustand)
│   │   │   ├── services/     # api.ts, socket.ts
│   │   │   └── admin/        # components/, stores/, services/ for back office
│   │   └── index.html
│   └── server/
│       └── src/
│           ├── index.ts      # Express app + Socket.IO setup
│           ├── start.ts      # Production entry (seeds + starts)
│           ├── config/database.ts  # SQLite connection
│           ├── middleware/auth.ts  # JWT middleware
│           ├── migrations/setup-sqlite.ts  # Schema creation
│           ├── seeds/seed-test-accounts.ts
│           ├── routes/       # auth, lobby, admin, history
│           └── services/
│               ├── authService.ts
│               ├── lobbyService.ts
│               ├── adminService.ts
│               ├── tournamentService.ts
│               ├── gameStateStore.ts
│               └── gameEngine/
│                   ├── gameLoop.ts        # Main game orchestrator
│                   ├── deck.ts            # 52-card deck, shuffle, deal
│                   ├── bettingRound.ts    # Round completion tracking
│                   ├── handEvaluator.ts   # Hand ranking evaluation
│                   ├── sidePotManager.ts  # Side pot calculations
│                   ├── positionManager.ts # Dealer/blind rotation
│                   ├── actionProcessor.ts # Action validation + processing
│                   ├── blindManager.ts    # Blind level timer
│                   └── tournamentElimination.ts
```

---

## 4. Database Schema


```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 1000,
  is_test_account INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE game_instances (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'texas_holdem',
  max_players INTEGER NOT NULL DEFAULT 3,
  buy_in INTEGER NOT NULL DEFAULT 1,
  starting_chips INTEGER NOT NULL DEFAULT 500,
  blind_interval_minutes INTEGER NOT NULL DEFAULT 3,
  table_theme TEXT DEFAULT 'classic-green',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  end_date TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE game_registrations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  game_instance_id TEXT NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(game_instance_id, player_id)
);

CREATE TABLE tournaments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  game_instance_id TEXT NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  current_blind_level INTEGER NOT NULL DEFAULT 1,
  prize_pool INTEGER NOT NULL DEFAULT 0,
  winner_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE tournament_players (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  chip_count INTEGER NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'active',
  finish_position INTEGER,
  eliminated_at TEXT,
  UNIQUE(tournament_id, player_id)
);

CREATE TABLE hand_histories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  hand_number INTEGER NOT NULL,
  community_cards TEXT NOT NULL DEFAULT '[]',
  actions TEXT NOT NULL DEFAULT '[]',
  players TEXT NOT NULL DEFAULT '[]',
  result TEXT NOT NULL DEFAULT '{}',
  pot_total INTEGER NOT NULL DEFAULT 0,
  played_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 5. Texas Hold'em Rules (as implemented)

### Hand Rankings (highest to lowest)
1. Royal Flush — A K Q J 10 same suit
2. Straight Flush — 5 consecutive same suit
3. Four of a Kind — 4 same rank
4. Full House — 3 of a kind + pair
5. Flush — 5 same suit
6. Straight — 5 consecutive ranks
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

### Betting Flow

**Preflop:**
- Small blind posts SB, big blind posts BB
- Action starts LEFT of BB (UTG) — except heads-up where Button/SB acts first
- Options: Fold / Call (match BB) / Raise
- BB can Check if nobody raised (or Raise)
- Round ends when all active players have acted AND bets equalized

**Postflop (Flop/Turn/River):**
- Action starts with first active player LEFT of dealer button
- If no bet: Check / Bet
- If facing a bet: Fold / Call / Raise
- Round ends when all active players acted AND bets equalized

**Heads-Up Special Rules:**
- Button = Small Blind
- Preflop: Button/SB acts FIRST
- Postflop: BB acts FIRST

### All-In Rules
- Player can go all-in for less than the call amount
- Creates side pots — all-in player only eligible for main pot
- If stack < minimum raise, only option is all-in (not raise)

### Showdown
- All non-folded players reveal cards
- Best 5-card hand from 7 cards (2 hole + 5 community) wins
- Ties split the pot equally (remainder to first player clockwise from button)

### Blind Schedule (8 levels, 3 min default)
| Level | SB | BB |
|-------|----|----|
| 1 | 10 | 20 |
| 2 | 15 | 30 |
| 3 | 25 | 50 |
| 4 | 50 | 100 |
| 5 | 75 | 150 |
| 6 | 100 | 200 |
| 7 | 150 | 300 |
| 8 | 200 | 400 |

New blinds apply at START of next hand (never mid-hand).

---

## 6. Game Lifecycle State Machine

```
GAME INSTANCE: open → full → in_progress → completed
TOURNAMENT: active → completed
HAND: deal → preflop → flop → turn → river → showdown → complete
PLAYER: active → folded | all_in → eliminated (0 chips)
```

### Registration → Game Start
1. Admin creates game_instance (status: open)
2. Players register (balance deducted, game_registrations row added)
3. When registeredPlayers.length === maxPlayers → status: full
4. Tournament created, tournament_players inserted
5. New open game_instance spawned (same config)
6. game:start emitted to all players
7. GameLoop started → first hand dealt

### Hand Loop
1. Rotate dealer, post blinds
2. Deal 2 hole cards per player (private)
3. Preflop betting round
4. If only 1 player remains → award pot, skip to step 9
5. Deal flop (3 cards), betting round
6. Deal turn (1 card), betting round
7. Deal river (1 card), betting round
8. Showdown → evaluate hands → award pot(s)
9. Save hand history to DB
10. Check eliminations (0 chips)
11. If 1 player remaining → tournament complete, credit prize
12. Else → wait 5 seconds → go to step 1

### All-In Runout (sequential)
When all players are all-in, deal remaining cards with delays:
- Flop: immediate
- Turn: +2.5 seconds
- River: +2.5 seconds
- Showdown: +2.0 seconds

---

## 7. API Endpoints

### Player Auth
```
POST /api/auth/register
  Body: { username: string, password: string }
  Response: { player: {...}, tokens: { accessToken, refreshToken } }
  Rules: username 3-20 alphanumeric, password 8+ chars

POST /api/auth/login
  Body: { username, password }
  Response: { player, tokens } or 401 "Invalid username or password"

POST /api/auth/logout
  Body: { refreshToken }

POST /api/auth/refresh
  Body: { refreshToken }
  Response: { tokens }

GET /api/auth/me
  Headers: Authorization: Bearer <accessToken>
  Response: { player: { id, username, balance, ... } }
```

### Lobby
```
GET /api/lobby/games
  Headers: Authorization: Bearer <token>
  Response: { games: GameInstance[] } (status=open, end_date > now)

POST /api/lobby/games/:id/register
  Headers: Authorization: Bearer <token>
  Validates: balance >= buyIn, game not full, not already registered
  Side effects: balance -= buyIn, registration created
  Response: { success, message, playerCount }

DELETE /api/lobby/games/:id/register
  Side effects: balance += buyIn, registration removed
```

### Admin
```
POST /api/admin/login
  Body: { username, password }
  Response: { success: true, admin: { username } }

GET /api/admin/players
  Response: { players: [{ id, username, balance, is_test_account, created_at, last_login_at }] }

POST /api/admin/games
  Body: { name, maxPlayers, blindIntervalMinutes?, startingChips?, tableTheme?, turnTimeSeconds? }

GET /api/admin/games?status=open
  Response: { games: GameInstance[] }

DELETE /api/admin/games/:id
  Side effects: refund all registered players, delete game
```

### Game State
```
GET /api/game/:gameId/state?playerId=xxx
  Response: { state: GameState } (includes player's hole cards)
```

---

## 8. WebSocket Events

### Server → Client
| Event | When | Payload |
|-------|------|---------|
| lobby:update | Player registers/unregisters | { gameId, playerCount, status } |
| game:start | Tournament begins | Full GameState with tableTheme |
| game:deal | Cards dealt | { holeCards: Card[], communityCards: Card[] } |
| game:state | After every action | Full sanitized GameState |
| game:turn | Turn changes | { playerId, timeRemaining } |
| game:blind-change | Blind level increases | BlindLevel |
| game:eliminate | Player busted | { playerId, position } |
| game:end | Tournament over | { tournamentId, winnerId, standings, prizePool } |

### Client → Server
| Event | When | Payload |
|-------|------|---------|
| lobby:subscribe | Lobby page mount | — |
| lobby:unsubscribe | Lobby page unmount | — |
| game:join | Table page mount | { gameId, playerId } |
| game:action | Player clicks button | { gameId, playerId, action: PlayerAction } |

---

## 9. Frontend State (Zustand)

```typescript
interface GameState {
  handState: HandState | null;
  tournament: Tournament | null;
  isMyTurn: boolean;
  myHoleCards: Card[];
  turnTimeRemaining: number;
  gameStatus: 'waiting' | 'playing' | 'ended';
  tournamentResult: TournamentResult | null;
  tableTheme: string; // 'classic-green' | 'dark-blue' | 'red-velvet' | 'midnight-purple' | 'pink-felt'
}
```

### State Sync Strategy
1. Primary: WebSocket events update store in real-time
2. Fallback: REST polling every 2 seconds when hole cards are missing
3. Reconnection: re-emit game:join → server sends current state + hole cards
4. JSON roundtrip on all incoming payloads to strip non-serializable objects

---

## 10. UI Layout (Mobile-First)

### Game Table — 3 Zone Vertical Layout (fits 100dvh, no scroll)
```
┌─────────────────────────┐
│ HEADER (50px)           │  ← Lobby | Lvl 1 • 10/20 • 15s | Tourney
├─────────────────────────┤
│                         │
│  TABLE AREA (flex-1)    │  ← Oval felt, opponents at top
│  ┌───────────────────┐  │     pot + community cards center
│  │ Opponent          │  │     my avatar + cards at bottom
│  │ Pot + Board Cards │  │
│  │ Me + My Cards     │  │
│  └───────────────────┘  │
├─────────────────────────┤
│ CONTROLS (shrink-0)     │  ← Slider + 3 buttons (Fold/Call/Raise)
└─────────────────────────┘
```

### Action Panel (when it's your turn)
- Slider: full width, min to max chips
- 3 buttons: Fold (gray/red) | Check/Call (green) | Raise/Bet/All-In (gold)
- Timer: countdown bar depleting left-to-right
- All-In auto-shown when stack < minimum raise

---

## 11. Configuration Options (per game)

| Option | Range | Default |
|--------|-------|---------|
| Max players | 2-10 | 3 |
| Blind interval | 1-30 min | 3 min |
| Max blind level | 4-20 | 8 |
| Starting chips | 100-10000 | 500 |
| Table theme | 5 options | classic-green |
| Turn time | 10-60 sec | 15 sec |
| Buy-in | Fixed $1 | $1 |
| Prize | Winner takes all | players × $1 |

---

## 12. Seeded Accounts

| Type | Username | Password | Notes |
|------|----------|----------|-------|
| Player | testplayer1 | password123 | $1000 balance, test account |
| Player | testplayer2 | password123 | $1000 balance, test account |
| Player | testplayer3 | password123 | $1000 balance, test account |
| Admin | admin | admin123 | Back office access |

---

## 13. Deployment (Render)

```
Build Command: npm install && npm run build --workspace=@spin-and-go/server
Start Command: npm run start --workspace=@spin-and-go/server
Instance: Free tier (512MB RAM, 0.1 CPU)
Auto-deploy: from GitHub main branch
```

The server build command runs `cd ../client && npm run build` which builds the React client into `packages/client/dist/`. The Express server serves this as static files with SPA fallback.

---

## 14. Key Algorithms

### Fisher-Yates Shuffle
```typescript
for (let i = cards.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [cards[i], cards[j]] = [cards[j], cards[i]];
}
```

### Hand Evaluation
Evaluate best 5-card hand from 7 cards (2 hole + 5 community):
- Generate all C(7,5) = 21 combinations
- Rank each 5-card hand
- Return the highest ranking

### Side Pot Calculation
When player(s) are all-in with different amounts:
1. Sort players by totalBetThisHand ascending
2. For each unique bet level, create a pot with contributions capped at that level
3. Eligible players for each pot = those who contributed at least that level

### Betting Round Completion
A betting round is complete when:
- All active (non-folded, non-all-in) players have acted at least once
- AND all active players have equal currentBet values

---

## 15. Error Handling

- **Player disconnect before game start:** Unregister, refund buy-in
- **Player disconnect during game:** Auto-fold on their turn (15s timeout)
- **Invalid action:** Server rejects, restarts turn timer, emits error to player
- **Server restart:** In-memory game state lost (SQLite persists accounts/games, but active hands are lost)
- **Token expiry:** Client catches 401, shows login redirect
- **Simultaneous elimination:** Player with more chips at hand start gets higher position

---

## 16. Known Limitations

- SQLite: single-server only, no horizontal scaling
- Free Render tier: spins down after 15 min inactivity (~50s cold start)
- In-memory game state: lost on server restart (active games interrupted)
- No persistent WebSocket sessions (reconnect required after server restart)
- No spectator mode, no chat, no hand strength indicators, no sound effects
- Admin auth uses localStorage (not secure for production)
