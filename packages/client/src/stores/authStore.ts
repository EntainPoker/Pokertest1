import { create } from 'zustand';
import type { Player, AuthResponse, TokenPair } from '@spin-and-go/shared';
import {
  apiFetch,
  getStoredTokens,
  setStoredTokens,
  clearStoredTokens,
} from '../services/api';

/** Public player info (without passwordHash) */
export type PublicPlayer = Omit<Player, 'passwordHash'>;

export interface AuthState {
  /** Current authenticated player, or null */
  player: PublicPlayer | null;
  /** Current token pair, or null */
  tokens: TokenPair | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether initial hydration from localStorage is complete */
  isHydrated: boolean;

  /** Register a new account */
  register: (username: string, password: string) => Promise<void>;
  /** Log in with existing credentials */
  login: (username: string, password: string) => Promise<void>;
  /** Log out and clear session */
  logout: () => Promise<void>;
  /** Hydrate state from localStorage on app start */
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  player: null,
  tokens: null,
  isAuthenticated: false,
  isHydrated: false,

  register: async (username: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    setStoredTokens(data.tokens);
    set({
      player: data.player,
      tokens: data.tokens,
      isAuthenticated: true,
    });
  },

  login: async (username: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    setStoredTokens(data.tokens);
    set({
      player: data.player,
      tokens: data.tokens,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    const { tokens } = get();
    try {
      if (tokens?.accessToken) {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch {
      // Logout should succeed locally even if server call fails
    } finally {
      clearStoredTokens();
      set({
        player: null,
        tokens: null,
        isAuthenticated: false,
      });
    }
  },

  hydrate: () => {
    const tokens = getStoredTokens();
    if (tokens) {
      // Decode the access token to get player info
      try {
        const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
        const player: PublicPlayer = {
          id: payload.playerId,
          username: payload.username,
          balance: 1000, // Temporary — will be updated by fetchProfile below
          createdAt: new Date(),
          lastLoginAt: new Date(),
          isTestAccount: false,
        };
        set({ tokens, player, isAuthenticated: true, isHydrated: true });

        // Fetch real balance from server
        apiFetch<{ player: PublicPlayer }>('/api/auth/me')
          .then((data) => {
            set({ player: data.player });
          })
          .catch(() => {
            // If fetch fails (e.g. token expired), clear auth state
            clearStoredTokens();
            set({ player: null, tokens: null, isAuthenticated: false });
          });
      } catch {
        set({ tokens, isAuthenticated: true, isHydrated: true });
      }
    } else {
      set({ isHydrated: true });
    }
  },
}));
