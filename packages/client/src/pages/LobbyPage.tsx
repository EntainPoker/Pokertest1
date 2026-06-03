import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { LobbyView } from '../components/lobby/LobbyView';
import { useAuthStore } from '../stores/authStore';
import { disconnectSocket } from '../services/socket';
import type { GameState as GameStatePayload } from '@spin-and-go/shared';

/**
 * Lobby page — wraps LobbyView with a header (username, balance, sign-out)
 * and handles game:start navigation to /table/:gameId.
 *
 * Key behaviors:
 * - Header shows player username and balance
 * - Sign-out button clears auth and navigates to /login
 * - Listens for game:start to auto-navigate to the table
 */
export function LobbyPage() {
  const navigate = useNavigate();
  const { player, logout } = useAuth();
  const socket = useSocket();

  // Listen for game:start — when a registered game starts, navigate to table
  useEffect(() => {
    const handleGameStart = (payload: GameStatePayload) => {
      const gameId = payload.tournament?.gameInstanceId;
      if (gameId) {
        navigate(`/table/${gameId}`);
      }
    };

    socket.on('game:start', handleGameStart);
    return () => {
      socket.off('game:start', handleGameStart);
    };
  }, [socket, navigate]);

  const handleSignOut = useCallback(async () => {
    await logout();
    disconnectSocket();
    navigate('/login');
  }, [logout, navigate]);

  // Refresh balance from store (may be updated after tournament end)
  const balance = useAuthStore((s) => s.player?.balance ?? 0);

  return (
    <div className="min-h-screen bg-poker-dark">
      {/* App header */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-poker-gold">
              Spin &amp; Go
            </span>
            {player && (
              <span className="text-sm text-gray-300">
                {player.username}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Balance display */}
            <span className="text-sm font-medium text-poker-gold">
              ${balance}
            </span>

            {/* Sign out button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Lobby content */}
      <LobbyView />
    </div>
  );
}
