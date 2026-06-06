import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { LobbyView } from '../components/lobby/LobbyView';
import { useAuthStore } from '../stores/authStore';
import { useLobbyStore } from '../stores/lobbyStore';
import { disconnectSocket } from '../services/socket';
import type { GameState as GameStatePayload } from '@spin-and-go/shared';

/**
 * Lobby page — wraps LobbyView with a header (username, balance, avatar, sign-out)
 * and handles game:start navigation to /table/:gameId.
 */
export function LobbyPage() {
  const navigate = useNavigate();
  const { player, logout } = useAuth();
  const socket = useSocket();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

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

  // Close avatar menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    if (avatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [avatarMenuOpen]);

  const handleSignOut = useCallback(async () => {
    await logout();
    disconnectSocket();
    navigate('/login');
  }, [logout, navigate]);

  // Refresh balance from store (may be updated after tournament end)
  const balance = useAuthStore((s) => s.player?.balance ?? 0);

  const avatarLetter = player?.username?.charAt(0).toUpperCase() ?? '?';

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

            {/* Player avatar with dropdown */}
            <div className="relative" ref={avatarMenuRef}>
              <button
                type="button"
                onClick={() => setAvatarMenuOpen((prev) => !prev)}
                className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full bg-gradient-to-br from-poker-gold to-amber-600 flex items-center justify-center text-gray-900 font-bold text-sm hover:from-yellow-400 hover:to-amber-500 transition-all shadow-md shadow-poker-gold/20 border-2 border-poker-gold/30"
                aria-label="Player menu"
                aria-expanded={avatarMenuOpen}
                aria-haspopup="true"
              >
                {avatarLetter}
              </button>

              {/* Dropdown menu */}
              {avatarMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      navigate('/history');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    {/* Cards icon */}
                    <svg className="w-4 h-4 text-poker-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2zm10-2l4 2v12l-4 2M17 5l4 2v12l-4 2" />
                    </svg>
                    Hand History
                  </button>
                </div>
              )}
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
