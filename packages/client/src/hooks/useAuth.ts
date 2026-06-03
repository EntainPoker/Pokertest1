import { useAuthStore } from '../stores/authStore';

/**
 * Hook wrapping the auth store for convenient component use.
 * Provides auth state and actions.
 */
export function useAuth() {
  const player = useAuthStore((s) => s.player);
  const tokens = useAuthStore((s) => s.tokens);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const hydrate = useAuthStore((s) => s.hydrate);

  return {
    player,
    tokens,
    isAuthenticated,
    isHydrated,
    register,
    login,
    logout,
    hydrate,
  };
}
