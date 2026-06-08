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

  // Filter games based on active tab using gameType field
  const filteredGames = games.filter(game => {
    const gameType = (game as any).gameType || (game.maxPlayers === 2 ? 'heads-up' : 'spin-and-go');
    if (activeTab === 'heads-up') return gameType === 'heads-up';
    if (activeTab === 'tourneys') return gameType === 'tourney';
    return gameType === 'spin-and-go';
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

      {/* Empty state (for any tab when no games) */}
      {!loading && !error && filteredGames.length === 0 && <EmptyLobbyMessage />}
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
