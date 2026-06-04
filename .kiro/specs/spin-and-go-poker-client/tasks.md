# Implementation Plan: Spin and Go Poker Client

## Overview

This implementation plan breaks down the Spin and Go poker client into incremental coding tasks. The system uses React + TypeScript for the frontend (player client and back office), Node.js + Express for the backend with Socket.IO for real-time communication, and PostgreSQL for persistence. Each task builds on previous steps, ensuring no orphaned code.

## Tasks

- [x] 1. Set up project structure, shared types, and database schema
  - [x] 1.1 Initialize monorepo with frontend (React + TypeScript + Vite), backend (Node.js + Express + TypeScript), and shared types package
    - Create directory structure matching the design (src/components, src/hooks, src/stores, src/services, src/types for frontend; services, routes, models for backend)
    - Configure TypeScript, ESLint, Tailwind CSS, Vitest, and fast-check
    - Set up package.json scripts for dev, build, and test
    - _Requirements: 13.1_

  - [x] 1.2 Define shared TypeScript types and interfaces
    - Implement all data model interfaces: Player, GameInstance, Tournament, TournamentPlayer, BlindLevel, Card, HandState, HandPlayer, SidePot, PlayerAction, HandHistory, HandHistoryAction, HandResult, HandRanking
    - Define the BLIND_SCHEDULE constant array with 8 levels
    - Define WebSocket event types and REST API request/response types
    - _Requirements: 8.1, 9.1_

  - [x] 1.3 Create PostgreSQL database schema and migrations
    - Create migration files for tables: players, game_instances, game_registrations, tournaments, tournament_players, hand_histories
    - Include indexes, foreign keys, and constraints as defined in the ER diagram
    - Set up database connection pool configuration
    - _Requirements: 1.1, 5.1_

  - [x] 1.4 Seed pre-configured test accounts
    - Create a seed script that inserts 3 test accounts with usernames, hashed passwords, and $1000 starting balance
    - Mark accounts with is_test_account = true
    - _Requirements: 1.5_

- [x] 2. Implement authentication system
  - [x] 2.1 Implement Auth Service (backend)
    - Create register endpoint: validate username (3-20 alphanumeric) and password (min 8 chars), hash password with bcrypt, create player with $1000 balance, return JWT token pair
    - Create login endpoint: validate credentials, return generic error on failure (same message for bad username or bad password), return JWT token pair on success
    - Create logout endpoint: invalidate refresh token
    - Create refresh token endpoint
    - Implement JWT middleware for route protection
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

  - [ ]* 2.2 Write property test for registration credential validation
    - **Property 1: Registration credential validation**
    - Generate random username/password combinations and verify acceptance/rejection matches the rules (3-20 alphanumeric username, 8+ char password)
    - **Validates: Requirements 1.1, 1.4**

  - [ ]* 2.3 Write property test for authentication error message uniformity
    - **Property 2: Authentication error message uniformity**
    - Generate invalid login attempts (non-existent username, wrong password) and verify the same generic error message is returned in both cases
    - **Validates: Requirements 1.3**

  - [ ]* 2.4 Write property test for route protection
    - **Property 3: Route protection for unauthenticated users**
    - Generate requests to all protected routes without valid auth tokens and verify redirect to sign-in
    - **Validates: Requirements 1.6**

  - [x] 2.5 Implement Auth UI components (frontend)
    - Create LoginForm.tsx with username/password fields, validation, error display, and submit handler
    - Create RegisterForm.tsx with username/password fields, validation rules display, error display, and submit handler
    - Create AuthGuard.tsx wrapper that redirects unauthenticated users to sign-in
    - Create authStore.ts (Zustand) for managing auth state, tokens, and user info
    - Create useAuth.ts hook for auth operations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement lobby and game registration
  - [x] 4.1 Implement Lobby Service (backend)
    - Create GET /api/lobby/games endpoint: return game instances with status "open" (fewer than 3 players) and end date not passed
    - Create POST /api/lobby/games/:id/register endpoint: validate player balance >= $1, game not full, player not already registered; use database transaction with row-level locking; deduct $1 and add registration
    - Create DELETE /api/lobby/games/:id/register endpoint: unregister player, refund $1
    - Implement WebSocket lobby:update event emission on player count changes
    - _Requirements: 2.1, 2.2, 2.4, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 Write property test for lobby game filtering
    - **Property 4: Lobby game filtering**
    - Generate sets of game instances with varying player counts and end dates, verify only those with count < 3 AND valid end date are returned
    - **Validates: Requirements 2.1**

  - [ ]* 4.3 Write property test for game instance display completeness
    - **Property 5: Game instance display completeness**
    - Generate game instances and verify each rendered output contains name, buy-in, player count, and valid status
    - **Validates: Requirements 2.2**

  - [ ]* 4.4 Write property test for registration state machine
    - **Property 6: Registration state machine correctness**
    - Generate combinations of player balance, game player count, and registration status; verify registration succeeds/fails correctly and balance/count remain consistent
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.5**

  - [x] 4.5 Implement Lobby UI components (frontend)
    - Create LobbyView.tsx: display list of available games, real-time updates via WebSocket
    - Create GameInstanceCard.tsx: show game name, buy-in ($1), player count (X/3), status badge, register button
    - Create EmptyLobbyMessage.tsx: display when no games available
    - Create lobbyStore.ts (Zustand) for lobby state management
    - Create useSocket.ts hook for WebSocket connection management
    - Implement responsive layout (320px to 1920px) using Tailwind CSS
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 13.1_

- [x] 5. Implement back office admin panel
  - [x] 5.1 Implement Admin Service (backend)
    - Create POST /api/admin/games endpoint: validate game name (non-empty), player count (2-6), set format to texas_holdem, blind interval to 3 min, starting chips to 500, buy-in to $1, end date to 30 days from creation
    - Create GET /api/admin/games endpoint: list all game instances with filters
    - Create DELETE /api/admin/games/:id endpoint: remove game instance
    - Implement expired game cleanup job: run every 60 seconds, remove expired games with no players, refund and remove expired games with players, allow active sessions to complete
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]* 5.2 Write property test for game creation parameter validation
    - **Property 11: Game creation parameter validation**
    - Generate game creation requests with valid/invalid parameters and verify acceptance/rejection matches validation rules
    - **Validates: Requirements 5.1, 5.8**

  - [ ]* 5.3 Write property test for end date calculation
    - **Property 12: End date calculation**
    - Generate creation dates and verify end date is exactly 30 days (720 hours) later
    - **Validates: Requirements 5.6**

  - [x] 5.4 Implement Back Office UI components (frontend)
    - Create GameCreationForm.tsx: form with game name, player count (2-6), validation, submit handler
    - Create GameInstanceList.tsx: display all game instances with status, player count, end date
    - Create GameInstanceDetails.tsx: show full game instance details
    - Create adminStore.ts and adminApi.ts service
    - _Requirements: 5.1, 5.8_

- [x] 6. Implement game lifecycle and tournament auto-start
  - [x] 6.1 Implement Tournament Service (backend)
    - Create tournament creation logic: when game instance reaches 3 players, create tournament, set status to "in_progress", assign starting chips (500) to each player
    - Implement new game instance spawning: when a game starts, create a new instance of the same type with 0 players
    - Implement disconnect handling: unregister player, refund buy-in, free seat if game not started
    - Emit game:start WebSocket event to all registered players within 5 seconds
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 6.2 Write property test for new instance creation on game start
    - **Property 7: New instance creation on game start**
    - Verify that when a game transitions to "in_progress", a new open instance of the same type is created
    - **Validates: Requirements 4.3**

  - [ ]* 6.3 Write property test for expired game cleanup with refunds
    - **Property 8: Expired game cleanup with refunds**
    - Generate expired game instances with 0, 1, or 2 players and verify correct removal/refund behavior
    - **Validates: Requirements 4.4, 4.5**

  - [ ]* 6.4 Write property test for lobby availability invariant
    - **Property 9: Lobby availability invariant**
    - Simulate sequences of registrations, starts, and expirations; verify at least one open instance per game type always exists
    - **Validates: Requirements 4.6**

  - [ ]* 6.5 Write property test for disconnect refund and seat release
    - **Property 10: Disconnect refund and seat release**
    - Simulate player disconnects before game start and verify unregistration, refund, and count decrement
    - **Validates: Requirements 4.7**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement poker game engine core
  - [x] 8.1 Implement card deck, shuffling, and dealing logic
    - Create Deck class: 52-card standard deck, Fisher-Yates shuffle, deal method
    - Implement dealing: 2 hole cards per active player, 3 flop cards, 1 turn card, 1 river card
    - Ensure all dealt cards are unique within a hand
    - _Requirements: 8.1_

  - [ ]* 8.2 Write property test for card dealing integrity
    - **Property 17: Card dealing integrity**
    - Generate hands and verify each player gets exactly 2 hole cards, all cards are unique, and all belong to a 52-card deck
    - **Validates: Requirements 8.1**

  - [x] 8.3 Implement dealer/blind position rotation
    - Create position manager: track dealer, small blind, big blind positions
    - Implement clockwise rotation after each hand (increment by 1 modulo active players)
    - Handle position adjustment when players are eliminated
    - _Requirements: 8.2_

  - [ ]* 8.4 Write property test for dealer position rotation
    - **Property 18: Dealer position rotation**
    - Generate sequences of hands and verify dealer rotates clockwise correctly
    - **Validates: Requirements 8.2**

  - [x] 8.5 Implement betting round management
    - Create BettingRound class: track current bet, min raise, player actions, hasActed flags
    - Implement round completion detection: all active players acted AND bets equalized (or all checked)
    - Implement community card progression: preflop → flop (3 cards) → turn (1 card) → river (1 card)
    - _Requirements: 8.3, 8.4, 8.5, 8.11_

  - [ ]* 8.6 Write property test for community card dealing progression
    - **Property 19: Community card dealing progression**
    - Generate hands progressing through rounds and verify correct card counts at each stage (0 → 3 → 4 → 5)
    - **Validates: Requirements 8.3, 8.4, 8.5**

  - [ ]* 8.7 Write property test for betting round completion detection
    - **Property 23: Betting round completion detection**
    - Generate betting round states and verify completion is detected correctly (all acted + bets equalized or all checked)
    - **Validates: Requirements 8.11**

  - [x] 8.8 Implement hand evaluation engine
    - Create hand evaluator: evaluate best 5-card hand from 7 cards (2 hole + 5 community)
    - Implement all hand rankings: Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, One Pair, High Card
    - Implement hand comparison for determining winners
    - Implement tie detection and pot splitting
    - _Requirements: 8.6, 8.7, 8.8_

  - [ ]* 8.9 Write property test for hand evaluation and pot award correctness
    - **Property 20: Hand evaluation and pot award correctness**
    - Generate showdown scenarios with known hands and verify correct winner determination and pot splitting for ties
    - **Validates: Requirements 8.6, 8.7, 8.8**

  - [x] 8.10 Implement player action processing
    - Create action validator: determine valid actions based on game state (check, bet, call, raise, fold, all-in)
    - Implement each action: check (pass), bet (validate range, deduct), call (match current bet), raise (validate min raise, deduct), fold (remove from hand), all-in (wager remaining stack)
    - Implement 30-second turn timer with auto-fold
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [ ]* 8.11 Write property test for valid action determination
    - **Property 14: Valid action determination**
    - Generate game states and verify the set of available actions matches the rules exactly (check iff no bet, call iff bet exists, etc.)
    - **Validates: Requirements 7.1, 7.6, 7.7**

  - [ ]* 8.12 Write property test for bet and raise amount validation
    - **Property 15: Bet and raise amount validation**
    - Generate bet/raise amounts and verify acceptance/rejection based on valid ranges (big blind to stack for bets, min raise increment to stack for raises)
    - **Validates: Requirements 7.3, 7.4, 7.10**

  - [ ]* 8.13 Write property test for fold removes player from hand
    - **Property 16: Fold removes player from hand**
    - Generate fold actions and verify player status changes to folded, no further action required, not eligible for pot
    - **Validates: Requirements 7.5**

  - [x] 8.14 Implement side pot calculation
    - Create side pot manager: when a player goes all-in, create main pot (matched contributions) and side pots (additional bets)
    - Ensure all-in player is only eligible for main pot
    - Handle multiple all-in scenarios with cascading side pots
    - _Requirements: 8.10_

  - [ ]* 8.15 Write property test for side pot calculation
    - **Property 22: Side pot calculation**
    - Generate all-in scenarios and verify main pot and side pot amounts are correct, and eligibility is properly assigned
    - **Validates: Requirements 8.10**

  - [x] 8.16 Implement fold-win logic (last player standing)
    - When all players except one fold, award pot to remaining player
    - Do not reveal folded players' hole cards in hand result
    - _Requirements: 8.9_

  - [ ]* 8.17 Write property test for fold-win without card reveal
    - **Property 21: Fold-win without card reveal**
    - Generate scenarios where all but one player folds and verify pot awarded correctly and folded cards not revealed
    - **Validates: Requirements 8.9**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement blind level progression and tournament completion
  - [x] 10.1 Implement blind level timer and progression
    - Create BlindManager: track current level, start 3-minute timer per level, emit blind-change events
    - Apply new blinds starting from the next hand after level change (not mid-hand)
    - Stay at final level (level 8) if all levels exhausted
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 10.2 Write property test for blind level application timing
    - **Property 24: Blind level application timing**
    - Generate blind level changes during active hands and verify new blinds only apply to the next hand
    - **Validates: Requirements 9.4**

  - [x] 10.3 Implement tournament elimination and completion
    - Detect player elimination: chip count reaches 0 at end of hand
    - Assign finishing positions: last eliminated = 2nd, first eliminated = 3rd
    - Handle simultaneous elimination: player with more chips at hand start gets higher position
    - Declare winner when one player remains
    - Award prize pool ($3) to winner's account balance
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 10.4 Write property test for tournament elimination and position assignment
    - **Property 25: Tournament elimination and position assignment**
    - Generate elimination sequences and verify correct position assignment including simultaneous elimination tiebreaker
    - **Validates: Requirements 10.1, 10.2, 10.6**

  - [ ]* 10.5 Write property test for prize pool calculation and distribution
    - **Property 26: Prize pool calculation and distribution**
    - Generate completed tournaments and verify prize pool = players × buy-in and full amount goes to 1st place
    - **Validates: Requirements 10.3, 10.5**

- [ ] 11. Implement poker table UI
  - [x] 11.1 Implement poker table display components
    - Create PokerTable.tsx: main table layout with 3 player positions arranged around the table
    - Create PlayerSeat.tsx: display username, chip count, current bet, active/folded state, highlight for active player
    - Create CommunityCards.tsx: display 0-5 community cards in center
    - Create PotDisplay.tsx: show current pot amount
    - Create DealerButton.tsx: dealer indicator at current dealer position
    - Create Card.tsx: card component with rank/suit display, face-down state for hidden cards
    - Create ChipStack.tsx: visual chip representation
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8_

  - [x] 11.2 Implement action panel and turn timer
    - Create ActionPanel.tsx: display valid actions (Check, Bet, Call, Raise, Fold, All-In) based on game state
    - Implement bet/raise amount input with min/max validation and slider
    - Create BlindTimer.tsx: display current blind level and countdown to next level
    - Create useTurnTimer.ts hook: 30-second countdown with auto-fold notification
    - Create Timer.tsx: reusable countdown timer component
    - _Requirements: 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [x] 11.3 Implement game state management and WebSocket integration
    - Create gameStore.ts (Zustand): manage full game state (hand state, player positions, community cards, pot, blinds)
    - Create useGameState.ts hook: subscribe to WebSocket game events, update store
    - Implement hole card privacy: only show current player's cards, hide opponents' cards
    - Handle game:start, game:deal, game:state, game:turn, game:blind-change, game:eliminate, game:end events
    - Wire ActionPanel to emit game:action events via WebSocket
    - _Requirements: 6.5, 7.1, 8.1_

  - [ ]* 11.4 Write property test for hole card privacy
    - **Property 13: Hole card privacy**
    - Generate game states for multiple players and verify each player's view only contains their own hole cards
    - **Validates: Requirements 6.5**

- [x] 12. Implement tournament lobby and hand history
  - [x] 12.1 Implement Tournament Lobby UI
    - Create TournamentLobby.tsx: overlay component accessible from poker table via button
    - Display current blind level, next blind level, countdown timer
    - Display player standings: username, chip count (active) or finishing position (eliminated), status
    - Display prize pool total and payout structure (winner takes all)
    - Display tournament start time and elapsed time (continuously updating)
    - Real-time updates as game state changes
    - Create PlayerStandings.tsx: player list with status indicators
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ]* 12.2 Write property test for tournament lobby player data completeness
    - **Property 27: Tournament lobby player data completeness**
    - Generate tournament states and verify all players listed with username, chip count/position, and correct status
    - **Validates: Requirements 11.3**

  - [x] 12.3 Implement Hand History feature
    - Create backend endpoint GET /api/history/:gameId/last-hand: return most recently completed hand data
    - Create LastHandSummary.tsx: display hand history overlay with actions by betting round, community cards at each stage, final result, pot size, winning hand, net chips won/lost
    - Implement "Last Hand" button on poker table (fixed position)
    - Handle case where no hand has been completed yet (display message)
    - Implement close control to dismiss and return to table
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 12.4 Write property test for hand history record completeness
    - **Property 28: Hand history record completeness**
    - Generate completed hands and verify history contains actions by round, community cards, pot size, winner, method, and net chip changes
    - **Validates: Requirements 12.2, 12.3**

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement responsive cross-platform support and final integration
  - [x] 14.1 Implement responsive layouts for all screens
    - Apply responsive Tailwind CSS classes to all screens (sign-in, lobby, poker table, tournament lobby, hand history)
    - Ensure no horizontal scrolling from 320px to 1920px
    - Ensure all interactive elements have minimum 44×44px touch targets on mobile
    - Support portrait and landscape orientations on mobile
    - Test and adjust layouts at breakpoints: 320px, 768px, 1024px, 1920px
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 14.2 Wire all components together and implement app routing
    - Set up React Router with routes: /login, /register, /lobby, /table/:gameId
    - Wrap protected routes with AuthGuard
    - Connect lobby registration flow to game auto-start and table navigation
    - Implement sign-out action (clear tokens, redirect to login)
    - Ensure tournament end navigates back to lobby with updated balance
    - Handle WebSocket reconnection with state resync
    - _Requirements: 1.6, 1.7, 2.1, 4.1, 4.2_

  - [ ]* 14.3 Write integration tests for end-to-end flows
    - Test full flow: register → login → lobby → register for game → game starts → play hand → tournament ends
    - Test WebSocket real-time updates (lobby count changes within 3 seconds)
    - Test turn timer auto-fold (30 second timeout)
    - Test disconnect/reconnect handling
    - _Requirements: 2.4, 4.1, 7.9, 4.7_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout (shared types between frontend and backend)
- Socket.IO handles real-time communication with automatic reconnection
- PostgreSQL transactions with row-level locking prevent race conditions in game registration
- The blind schedule has 8 levels progressing from 10/20 to 200/400 relative to 500 starting chips

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5"] },
    { "id": 4, "tasks": ["4.1", "5.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4", "4.5", "5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "6.4", "6.5", "8.1"] },
    { "id": 8, "tasks": ["8.2", "8.3", "8.5", "8.8"] },
    { "id": 9, "tasks": ["8.4", "8.6", "8.7", "8.9", "8.10", "8.14", "8.16"] },
    { "id": 10, "tasks": ["8.11", "8.12", "8.13", "8.15", "8.17"] },
    { "id": 11, "tasks": ["10.1", "10.3"] },
    { "id": 12, "tasks": ["10.2", "10.4", "10.5", "11.1"] },
    { "id": 13, "tasks": ["11.2", "11.3"] },
    { "id": 14, "tasks": ["11.4", "12.1", "12.3"] },
    { "id": 15, "tasks": ["12.2", "12.4"] },
    { "id": 16, "tasks": ["14.1", "14.2"] },
    { "id": 17, "tasks": ["14.3"] }
  ]
}
```
