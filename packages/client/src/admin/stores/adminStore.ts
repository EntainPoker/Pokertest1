import { create } from 'zustand';
import type { GameInstance, GameCreationRequest } from '@spin-and-go/shared';
import * as adminApi from '../services/adminApi';

export interface AdminState {
  /** All game instances visible to admin */
  games: GameInstance[];
  /** Whether a fetch/mutation is in progress */
  loading: boolean;
  /** Error message from the last failed operation */
  error: string | null;

  /** Fetch all game instances */
  fetchGames: () => Promise<void>;
  /** Create a new game instance */
  createGame: (request: GameCreationRequest) => Promise<void>;
  /** Delete a game instance by ID */
  deleteGame: (gameId: string) => Promise<void>;
  /** Clear the current error */
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  games: [],
  loading: false,
  error: null,

  fetchGames: async () => {
    set({ loading: true, error: null });
    try {
      const games = await adminApi.listGames();
      set({ games, loading: false });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to fetch games';
      set({ error: message, loading: false });
    }
  },

  createGame: async (request: GameCreationRequest) => {
    set({ loading: true, error: null });
    try {
      const game = await adminApi.createGame(request);
      set({ games: [...get().games, game], loading: false });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to create game';
      set({ error: message, loading: false });
      throw err;
    }
  },

  deleteGame: async (gameId: string) => {
    set({ loading: true, error: null });
    try {
      await adminApi.deleteGame(gameId);
      set({
        games: get().games.filter((g) => g.id !== gameId),
        loading: false,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to delete game';
      set({ error: message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
