import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../../stores/lobbyStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';
import { GameInstanceCard } from './GameInstanceCard';
import { EmptyLobbyMessage } from './EmptyLobbyMessage';

type FilterTab = 'spin-and-go' | 'heads-up' | 'tourneys';

export function LobbyView() {
  const navigate = useNavigate();
  const currentPlayerId = useAuthStore((s) => s.player?.id ?? '');
  const {
    games,
    activeGames,
    loading,
    error,
    registering,
    registrationMessage,
    fetchGames,
    fetchActiveGames,
    registerForGame,
    unregisterFromGame,
    applyLobbyUpdate,
    clearRegistrationMessage,
  } = useLobbyStore();

  const socket = useSocket();
  const [activeTab, setActiveTab] = useState<FilterTab>('spin-and-go');

  // Fetch games and active games on mount
  useEffect(() => {
    fetchGames();
    fetchActiveGames();
  }, [fetchGames, fetchActiveGames]);

  // Subscribe to real-time lobby updates via WebSocket
  useEffect(() => {
    socket.emit('lobby:subscribe');

    const handleLobbyUpdate = (payload: any) => {
      applyLobbyUpdate(payload);
      if (payload.status === 'full' || payload.status === 'in_progress') {
        const game = games.find(g => g.id === payload.gameId);
        if (game && game.registeredPlayers.includes(currentPlayerId)) {
          navigate(`/table/${payload.gameId}`);
        }
      }
    };

    socket.on('lobby:update', handleLobbyUpdate);

    return () => {
      socket.off('lobby:update', handleLobbyUpdate);
      socket.emit('lobby:unsubscribe');
    };
  }, [socket, applyLobbyUpdate, navigate, games, currentPlayerId]);

  // Auto-dismiss registration message after 3 seconds
  useEffect(() => {
    if (registrationMessage) {
      const timer = setTimeout(clearRegistrationMessage, 3000);
      return () => clearTimeout(timer);
    }
  }, [registrationMessage, clearRegistrationMessage]);

  const handleRegister = async (gameId: string) => {
    try {
      const result = await registerForGame(gameId);
      const game = games.find(g => g.id === gameId);
      if (game && result.playerCount >= game.maxPlayers) {
        setTimeout(() => navigate(`/table/${gameId}`), 1000);
      }
    } catch {
      // Error handled in store
    }
  };

  const handleUnregister = async (gameId: string) => {
    try {
      await unregisterFromGame(gameId);
    } catch {
      // Error handled in store
    }
  };

  // Filter games based on active tab
  const filteredGames = games.filter(game => {
    if (activeTab === 'heads-up') {
      return game.maxPlayers === 2;
    }
    if (activeTab === 'tourneys') {
      return false; // Coming soon — no games to show
    }
    // spin-and-go: 3+ players
    return game.maxPlayers >= 3;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'spin-and-go', label: 'Spin & Go' },
    { key: 'heads-up', label: 'Heads Up' },
    { key: 'tourneys', label: 'Tourneys' },
  ];

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8">
      {/* Active Tables Bar — show if player has active games */}
      {activeGames.length > 0 && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-gray-800/80 border border-poker-gold/30 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                Your Active Tables ({activeGames.length})
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {activeGames.map((game) => (
                <button
                  key={game.gameId}
                  type="button"
                  onClick={() => navigate(`/table/${game.gameId}`)}
                  className="shrink-0 min-h-[40px] px-4 py-2 rounded-lg bg-gradient-to-r from-green-700 to-green-800 border border-green-600/50 text-white text-xs sm:text-sm font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-md"
                >
                  <span className="block">{game.name}</span>
                  <span className="block text-[10px] text-green-300">{game.playerCount} players • In Progress</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Premium filter tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800/50 px-2 py-1">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`min-h-[48px] px-6 py-3 text-base font-bold rounded-lg border-b-3 transition-all ${
                  activeTab === tab.key
                    ? 'text-poker-gold border-b-2 border-poker-gold bg-gray-800/70 shadow-lg shadow-poker-gold/10'
                    : 'text-gray-500 border-b-2 border-transparent hover:text-gray-300 hover:bg-gray-800/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Registration feedback toast */}
      {registrationMessage && (
        <div
          role="alert"
          className="max-w-7xl mx-auto mb-4 px-4 py-3 rounded-xl bg-gray-800/90 border border-poker-gold/40 text-gray-200 text-sm backdrop-blur-sm shadow-lg"
        >
          {registrationMessage}
        </div>
      )}

      {/* Tourneys coming soon state */}
      {activeTab === 'tourneys' && !loading && (
        <div className="max-w-7xl mx-auto text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/60 border border-gray-700 mb-6">
            <svg className="w-10 h-10 text-poker-gold/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.996.178-1.768.65-2.08 1.283m0 0a5.607 5.607 0 01-.18.668c-.263.773-.267 1.59.01 2.374A3.757 3.757 0 004.5 10.5m-1.33-4.98C3.88 5.205 4.66 5 5.5 5h13c.84 0 1.62.205 2.33.52M18.75 4.236c.996.178 1.768.65 2.08 1.283m0 0c.07.21.13.427.18.668.263.773.267 1.59-.01 2.374A3.757 3.757 0 0119.5 10.5m1.33-4.98C20.12 5.205 19.34 5 18.5 5" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-300 mb-2">Tournaments Coming Soon</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Multi-table tournaments with bigger prize pools are on the way. Stay tuned for updates.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-poker-gold border-t-transparent" role="status">
            <span className="sr-only">Loading games…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="max-w-7xl mx-auto text-center py-16">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchGames}
            className="min-h-[44px] min-w-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-poker-gold to-amber-500 text-gray-900 font-bold hover:from-yellow-400 hover:to-amber-400 transition-all shadow-lg shadow-poker-gold/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state (for Spin & Go / Heads Up when no games) */}
      {!loading && !error && activeTab !== 'tourneys' && filteredGames.length === 0 && <EmptyLobbyMessage />}

      {/* Game grid */}
      {!loading && !error && filteredGames.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredGames.map((game) => (
            <GameInstanceCard
              key={game.id}
              game={game}
              currentPlayerId={currentPlayerId}
              onRegister={handleRegister}
              onUnregister={handleUnregister}
              registering={registering}
            />
          ))}
        </div>
      )}
    </div>
  );
}
