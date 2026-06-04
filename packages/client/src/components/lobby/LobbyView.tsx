import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../../stores/lobbyStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';
import { GameInstanceCard } from './GameInstanceCard';
import { EmptyLobbyMessage } from './EmptyLobbyMessage';

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

  // Fetch games on mount
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Subscribe to real-time lobby updates via WebSocket
  useEffect(() => {
    socket.emit('lobby:subscribe');

    const handleLobbyUpdate = (payload: any) => {
      applyLobbyUpdate(payload);
      // If a game becomes full or in_progress, navigate only if the current player is registered
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

  return (
    <div className="min-h-screen bg-poker-dark px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-poker-gold">
          Spin &amp; Go Lobby
        </h1>
        <p className="text-gray-400 mt-1 text-sm sm:text-base">
          Choose a game and register to play. Games start when 3 players join.
        </p>
      </header>

      {/* Registration feedback toast */}
      {registrationMessage && (
        <div
          role="alert"
          className="max-w-7xl mx-auto mb-4 px-4 py-3 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm"
        >
          {registrationMessage}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-poker-gold border-t-transparent" role="status">
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
            className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-md bg-poker-gold text-poker-dark font-semibold hover:bg-yellow-500 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && games.length === 0 && <EmptyLobbyMessage />}

      {/* Game grid — responsive: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      {!loading && !error && games.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
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
