import type { GameState } from '@spin-and-go/shared';

/** In-memory store of active game states so late-joining players get current state */
export const activeGameStates = new Map<string, GameState>();
