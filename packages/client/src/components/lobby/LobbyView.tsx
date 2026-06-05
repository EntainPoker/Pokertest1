import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../../stores/lobbyStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';
import { GameInstanceCard } from './GameInstanceCard';
import { EmptyLobbyMessage } from './EmptyLobbyMessage';

type FilterTab = 'spin-and-go' | 'heads-up';

export function LobbyView() {
  const navigate = useNavigate();
  const currentPlayerId = useAuthStore((s) => s.player?.id ?? '');
  const {
    games,
    loading,
    error,
    registering,
    registrationMessage,
    fetchGames,
    registerForGame,
    unregisterFromGame,
    applyLobbyUpdate,
    clearRegistrationMessage,
  } = useLobbyStore();

  const socket = useSocket();
  const [activeTab, setActiveTab] = useState<FilterTab>('spin-and-go');

  // Fetch games on mount
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

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
    // spin-and-go: 3+ players
    return game.maxPlayers >= 3;
  });

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8">
      {/* Filter tabs */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="flex gap-1 border-b border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('spin-and-go')}
            className={`min-h-[44px] px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'spin-and-go'
                ? 'text-poker-gold border-poker-gold'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            Spin &amp; Go
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('heads-up')}
            className={`min-h-[44px] px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'heads-up'
                ? 'text-poker-gold border-poker-gold'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            Heads Up
          </button>
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

      {/* Empty state */}
      {!loading && !error && filteredGames.length === 0 && <EmptyLobbyMessage />}

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
