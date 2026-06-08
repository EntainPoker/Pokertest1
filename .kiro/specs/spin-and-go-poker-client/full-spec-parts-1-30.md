# FULL POKER PLATFORM SPECIFICATION — PARTS 1-30

## PROJECT OVERVIEW
Production-quality No Limit Texas Hold'em poker platform.
- Supports 2-9 handed play
- Real-time multiplayer via WebSocket (Socket.IO)
- React + TypeScript frontend, Node.js backend, SQLite database
- Deployed on Render, GitHub repo: EntainPoker/Pokertest1

## CURRENT STATUS (as of this session)

### IMPLEMENTED (Parts 1-12 focused):
- ✅ Full game engine (betting, side pots, showdown, hand evaluation)
- ✅ Real-time multiplayer via Socket.IO
- ✅ Auth system (register, login, JWT)
- ✅ Lobby with Spin & Go / Heads Up / Tourneys tabs
- ✅ Admin back office (create games, manage instances)
- ✅ Table UI redesign (players outside oval, cards above name pills)
- ✅ Timer (15s per action, server-authoritative)
- ✅ Position labels (BTN, SB, BB, UTG, etc.)
- ✅ Card privacy (fold = no reveal, showdown = reveal non-folded)
- ✅ Winner banner ("Player Wins $X with Hand Type")
- ✅ Quick bet buttons (1.5x, 2x, 3x)
- ✅ Active tables bar in lobby
- ✅ Hand history page (/history)
- ✅ Game type categorization (spin-and-go, heads-up, tourney)

### OUTSTANDING ISSUES TO FIX:
1. Timer countdown animation (works first action only, then shows static 15)
2. Multi-player seating (3+ players need to spread around table, not stack on top)
3. Chip-to-pot animation (chips should visually move to center between rounds)
4. Winner chip slide animation (chips from pot to winner)
5. Database persistence (SQLite wiped on deploy — need persistent disk or Postgres)
6. Desktop card sizing at 100% zoom

### PARTS 13-30 (ON HOLD — FUTURE ROADMAP):
- Part 13: Full engine code (already done)
- Part 14: Real-time multiplayer (already done)
- Part 15: Frontend poker UI (mostly done, needs polish)
- Part 16: Database + persistence (need Postgres migration)
- Part 17: Deployment scaling (future)
- Part 18: Time bank, auto-rebuy, sit-out rules, table themes
- Part 19: Tournament systems (MTT, Spin & Go multiplier, payout structures)
- Part 20: Cash game economy (rake, min/max buy-in)
- Part 21: Advanced matchmaking
- Part 22: Security + anti-cheat
- Part 23: Performance optimisation
- Part 24: Observability & analytics
- Part 25: Replay + simulation engine
- Part 26: Admin control panel (partially done)
- Part 27: Mobile + cross-platform optimisation
- Part 28: Live ops (challenges, leaderboards, promotions)
- Part 29: Audio / visual polish
- Part 30: Platform hardening (DR, failover, multi-region)

---

## PARTS 1-12 KEY RULES (AUTHORITATIVE REFERENCE)

### PART 1 — CORE ARCHITECTURE
- Standard 52 card deck, shuffled before every hand
- Player states: ACTIVE, FOLDED, ALL_IN, ELIMINATED, DISCONNECTED
- Dealer button moves clockwise after every hand
- Heads-up: dealer = SB, acts first preflop, acts last postflop
- Position labels: BTN, SB, BB, UTG, UTG+1, MP, MP+1, HJ, CO
- Hero always at bottom-centre (visual only)

### PART 2 — BETTING ENGINE
- Minimum bet = big blind
- Minimum raise = previous raise size (not total, the INCREMENT)
- Action reopens ONLY after a FULL raise (short all-in does NOT reopen)
- Big blind gets option to check/raise if no raise preflop
- Uncalled bets returned to bettor (never enter pot)
- Timer: 15 seconds, auto-check if available, otherwise auto-fold
- Quick bets: MIN, 1.5x, 2x, 3x, POT, ALL-IN
- Slider default = minimum legal wager (never remembers prior value)

### PART 3 — UI/UX
- Table is oval with dark border, green felt
- Pot displayed centre above community cards
- Per-player bet displayed in front of each player ON the table
- Action labels: CHECK, BET, CALL, RAISE, ALL-IN, FOLD (visible 1.5s)
- Winner: "WINS $X" + hand type, glow effect, 3 seconds display
- Fold: cards grey, slide to muck (500ms)
- Controls: Fold (red), Check/Call (green), Bet/Raise (amber)
- Cards never overlap bet/stack displays

### PART 4 — POT ENGINE
- Chip conservation: total chips never changes
- Side pots created when players all-in for different amounts
- Split pots divide equally (odd chip to first left of dealer)
- Uncalled bets return with animation
- Pot updates only after betting round completes
- Display: Main Pot, Side Pot 1, Side Pot 2, etc.

### PART 5 — SHOWDOWN ENGINE
- Best 5 from 7 cards (21 combinations evaluated)
- Rankings: Royal Flush > Straight Flush > Quads > Full House > Flush > Straight > Trips > Two Pair > Pair > High Card
- Kickers break ties in descending order
- Board plays valid (0 hole cards used)
- Cards revealed only at actual showdown (2+ non-folded players)
- Fold win = no card reveal

### PART 6 — ANIMATION ENGINE
- Card deal: one at a time, clockwise, 120-200ms per card
- Flop: 3 cards simultaneous, 400-600ms
- Turn/River: single card, 300-500ms
- Betting: chips slide to betting zone, 200-400ms
- Pot collection: all bets to centre, 500-900ms staggered
- Fold: cards dim + slide to muck, 500ms
- Showdown: reveal sequence with pauses
- All-in runout: cinematic mode with 1.5-2s pauses
- Animation lock: no player actions during animations

### PART 7 — EDGE CASES
- Server is single source of truth (clients never override)
- Disconnect: timer continues, auto-check/fold on timeout
- Reconnect: full state snapshot, replace local state
- Duplicate actions ignored (first valid only)
- Rate limiting: max actions per second per player
- Stack/pot integrity checks (never negative, never duplicated)

### PART 8 — QA CRITERIA
- 100% chip conservation across all hands
- All winners mathematically correct
- All side pots correctly constructed
- No illegal action ever accepted
- No state desync persists after reconciliation

---

## TECH STACK
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- Backend: Node.js + Express + Socket.IO + TypeScript
- Database: SQLite (better-sqlite3) — needs migration to Postgres for persistence
- Shared types: @spin-and-go/shared monorepo package
- Testing: Vitest + fast-check (property-based)
- Hosting: Render (free tier, ephemeral filesystem)
- Repo: https://github.com/EntainPoker/Pokertest1

## FILE STRUCTURE
```
packages/
  client/          — React frontend (Vite)
    src/
      components/  — UI components (table/, lobby/, shared/, auth/, etc.)
      hooks/       — React hooks (useGameState, useTurnTimer, useSocket, etc.)
      stores/      — Zustand stores (gameStore, lobbyStore, authStore)
      services/    — API + socket services
      pages/       — Route pages (LobbyPage, GamePage, HistoryPage, etc.)
      admin/       — Admin panel components
  server/          — Node.js backend
    src/
      services/gameEngine/  — Poker engine (actionProcessor, bettingRound, gameLoop, etc.)
      routes/      — Express routes (auth, lobby, admin, history)
      migrations/  — SQLite schema
      config/      — Database connection
  shared/          — Shared TypeScript types
    src/index.ts   — All interfaces and types
```

## INSTRUCTIONS FOR FUTURE SESSIONS
When resuming work on this project:
1. Read this file first for full context
2. The Parts 1-12 rules above are AUTHORITATIVE for poker logic
3. Check the "OUTSTANDING ISSUES" section for what needs fixing next
4. All code is committed and pushed to GitHub
5. Render auto-deploys from main branch
