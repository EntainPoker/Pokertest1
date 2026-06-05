import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { LobbyView } from '../components/lobby/LobbyView';
import { useAuthStore } from '../stores/authStore';
import { useLobbyStore } from '../stores/lobbyStore';
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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black">
      {/* Premium app header */}
      <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl font-extrabold bg-gradient-to-r from-poker-gold to-amber-400 bg-clip-text text-transparent">
              Entain Poker
            </span>
            {player && (
              <span className="text-sm text-gray-400 font-medium">
                {player.username}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Balance display */}
            <div className="flex items-center gap-2 bg-gray-800/60 border border-poker-gold/20 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-poker-gold" aria-hidden="true" />
              <span className="text-sm font-bold text-poker-gold">
                ${balance.toLocaleString()}
              </span>
            </div>

            {/* Sign out button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-full text-sm font-medium text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all"
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
