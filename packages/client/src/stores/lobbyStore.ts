import { create } from 'zustand';
import type { GameInstance, LobbyGameResponse, RegistrationResult, LobbyUpdatePayload } from '@spin-and-go/shared';
import { apiFetch } from '../services/api';
import { useAuthStore } from './authStore';

/** Game instance without the createdBy field (as returned by the lobby API) */
export type LobbyGame = Omit<GameInstance, 'createdBy'>;

export interface LobbyState {
  /** List of available games */
  games: LobbyGame[];
  /** Whether games are being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether a registration is in progress */
  registering: boolean;
  /** Last registration result message */
  registrationMessage: string | null;

  /** Fetch available games from the API */
  fetchGames: () => Promise<void>;
  /** Register the current player for a game */
  registerForGame: (gameId: string) => Promise<RegistrationResult>;
  /** Unregister the current player from a game */
  unregisterFromGame: (gameId: string) => Promise<void>;
  /** Apply a real-time lobby update from WebSocket */
  applyLobbyUpdate: (payload: LobbyUpdatePayload) => void;
  /** Clear the registration message */
  clearRegistrationMessage: () => void;
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  games: [],
  loading: false,
  error: null,
  registering: false,
  registrationMessage: null,

  fetchGames: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<LobbyGameResponse>('/api/lobby/games');
      set({ games: data.games, loading: false });
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to load games';
      set({ error: message, loading: false });
    }
  },

  registerForGame: async (gameId: string) => {
    set({ registering: true, registrationMessage: null });
    try {
      const result = await apiFetch<RegistrationResult>(
        `/api/lobby/games/${gameId}/register`,
        { method: 'POST' },
      );
      set({ registering: false, registrationMessage: result.message });

      // Update balance in auth store (deduct buy-in)
      const player = useAuthStore.getState().player;
      if (player) {
        useAuthStore.setState({ player: { ...player, balance: player.balance - 1 } });
      }

      // Refetch games to get accurate state
      await get().fetchGames();

      return result;
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Registration failed';
      set({ registering: false, registrationMessage: message });
      throw err;
    }
  },

  unregisterFromGame: async (gameId: string) => {
    set({ registering: true, registrationMessage: null });
    try {
      await apiFetch(`/api/lobby/games/${gameId}/register`, { method: 'DELETE' });
      set({ registering: false, registrationMessage: 'Successfully unregistered' });

      // Update balance in auth store (refund buy-in)
      const player = useAuthStore.getState().player;
      if (player) {
        useAuthStore.setState({ player: { ...player, balance: player.balance + 1 } });
      }

      // Refetch to get accurate state
      await get().fetchGames();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to unregister';
      set({ registering: false, registrationMessage: message });
    }
  },

  applyLobbyUpdate: (_payload: LobbyUpdatePayload) => {
    // Refetch games from server to get accurate counts
    get().fetchGames();
  },

  clearRegistrationMessage: () => {
    set({ registrationMessage: null });
  },
}));
