# Parts 1-12 Poker Specification (Authoritative Reference)

This document is the authoritative spec for the poker engine implementation.
Parts 13-30 are on hold (production scaling, advanced features).

## Key Rules for Implementation (from spec)

### Action Reopening (Rule 42-45)
- Action ONLY reopens after a FULL raise
- Short all-in does NOT reopen action
- Example: Bet 100, All-in 120 (increase 20, not full raise) → action does NOT reopen

### Minimum Raise (Rule 31)
- Minimum raise must equal previous full raise size
- Example: Bet 100, Raise to 300 (raise size 200), next min raise = 200, min total = 500

### Big Blind Option (Rule 48)
- If no raise occurs preflop, BB retains option to check or raise
- Action not complete until BB acts

### Position Labels (Rule 19, 83)
- BTN, SB, BB, UTG, UTG+1, MP, MP+1, HJ, CO
- Must update every hand
- Labels displayed near player

### Heads-Up Rules (Rule 10, 72)
- Dealer posts SB, acts first preflop, acts last postflop
- Opponent posts BB, acts second preflop, acts first postflop

### Timer (Rule 64-66)
- Default 15 seconds
- Final 5 seconds: timer changes colour, visual warning
- On expiry: auto-check if available, otherwise auto-fold

### Betting Controls (Rule 50-63)
- Quick bet buttons: MIN, 2X, 3X, ½ POT, ¾ POT, POT, ALL-IN
- Slider default = minimum legal wager (never remembers prior value)
- Preflop quick bets: MIN RAISE, 2X BB, 2.5X BB, 3X BB, ALL-IN

### Uncalled Bets (Rule 164-165)
- Uncalled chips never enter pot
- Return chips to bettor with visual animation

### Last Aggressor (Rule 47)
- Track last aggressor for showdown reveal order

### Fold Animation (Rule 37, 102)
- "FOLD" label appears
- Cards grey out
- Cards slide toward muck
- Duration: 500ms

### Winner Display (Rule 106-108, 234-235)
- Winner highlighted with glow
- Display: "WINS $X" + hand type
- Duration: 3 seconds

### Showdown Hand Labels (Rule 110-111)
- Display hand ranking name near player cards during showdown

### Chip Conservation (Rule 147, 453)
- Total chips before hand = Total chips after hand (always)

### Betting Round Completion (Rule 46)
- Street completes when every active player has: Folded, Called, Checked, or All-In
- No pending action remains
